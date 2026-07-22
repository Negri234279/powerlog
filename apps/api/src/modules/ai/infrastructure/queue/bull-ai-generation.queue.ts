import { Injectable } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import type { Job, Queue, Worker } from 'bullmq'
import type { PinoLogger } from 'nestjs-pino'

import { BullQueueFactory } from '../../../../queue/bull-queue.factory'
import { AiGenerationQueue } from '../../application/ports/ai-generation-queue.port'
import { RunAiGenerationCommand } from '../../application/commands/run-ai-generation/run-ai-generation.command'

const QUEUE_NAME = 'ai-generation'

interface GenerationJob {
    generationId: string
}

/**
 * Where the slow half runs: BullMQ on Redis, so a generation survives the
 * request that asked for it, a deploy, and the browser being closed.
 *
 * The connections and their shutdown are the shared {@link BullQueueFactory}'s
 * job; this class owns only what is the AI module's — the queue name, the
 * no-retry policy, and handing the id to {@link RunAiGenerationCommand}.
 */
@Injectable()
export class BullAiGenerationQueue extends AiGenerationQueue {
    private readonly queue: Queue<GenerationJob>
    private readonly worker: Worker<GenerationJob>

    constructor(
        queues: BullQueueFactory,
        private readonly commandBus: CommandBus,
        private readonly logger: PinoLogger,
    ) {
        super()
        this.logger.setContext(BullAiGenerationQueue.name)

        this.queue = queues.createQueue<GenerationJob>(QUEUE_NAME)
        this.worker = queues.createWorker<GenerationJob>(QUEUE_NAME, (job) => this.process(job), {
            // A handful at a time: the work is one slow HTTP call to a provider, so
            // it costs a socket rather than a core, and one athlete's block must not
            // hold up everyone else's session.
            concurrency: 4,
            // A generation legitimately runs for tens of seconds — up to the 120s
            // the provider call is capped at. The default 30s lock would have BullMQ
            // calling healthy jobs stalled; the renewal only saves us while the event
            // loop is free.
            lockDuration: 150_000,
        })

        this.worker.on('failed', (job, error) => {
            // The outcome the athlete sees was already written to the row by the
            // command; a job failing here means the command itself could not
            // complete — a database it could not reach, a process that went away.
            this.logger.error({ generationId: job?.data.generationId, err: error }, 'AI generation job failed')
        })
        this.worker.on('error', (error) => {
            this.logger.error({ err: error }, 'AI generation worker error')
        })
    }

    async enqueue(generationId: string): Promise<void> {
        await this.queue.add(
            'run',
            { generationId },
            {
                // The generation's own id is the dedupe key: a second job for the
                // same row collapses into the first. The separator constraint that
                // bit the billing queue does not apply — a uuid carries no colons.
                jobId: generationId,
                // One attempt, deliberately. Every attempt is a paid call to the
                // athlete's own provider account, and a model that answered
                // unusably once will do it again — a retry mostly buys a second
                // bill. Failures are recorded on the row for the athlete to see and
                // ask again from.
                attempts: 1,
                // Bounded so a `noeviction` Redis never grows without limit.
                removeOnComplete: { age: 3_600, count: 1_000 },
                removeOnFail: { age: 24 * 3_600 },
            },
        )
    }

    private async process(job: Job<GenerationJob>): Promise<void> {
        const command = new RunAiGenerationCommand(job.data.generationId)
        await this.commandBus.execute<RunAiGenerationCommand, void>(command)
    }
}
