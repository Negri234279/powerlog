import { Injectable } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import type { PinoLogger } from 'nestjs-pino'

import { RunAiGenerationCommand } from '../../application/commands/run-ai-generation/run-ai-generation.command'
import { AiGenerationQueue } from '../../application/ports/ai-generation-queue.port'

/**
 * The fallback for when `REDIS_URL` is unset — a supported mode, not a
 * degradation: `pnpm dev` without Docker and the test suites run this one.
 *
 * It runs the job in this process, but **after** the caller has returned. That is
 * the whole point of the feature: the mutation must not wait for the provider,
 * whether or not there is a Redis behind it. What is lost without Redis is
 * durability — a generation in flight when the process stops is not picked back
 * up — and cross-instance distribution, neither of which matters in the modes
 * this adapter serves.
 */
@Injectable()
export class InProcessAiGenerationQueue extends AiGenerationQueue {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly logger: PinoLogger,
    ) {
        super()
        this.logger.setContext(InProcessAiGenerationQueue.name)
    }

    async enqueue(generationId: string): Promise<void> {
        // Detached on purpose, and never awaited — awaiting it here would put the
        // provider call back inside the request it was moved out of.
        setImmediate(() => {
            void this.run(generationId)
        })
    }

    private async run(generationId: string): Promise<void> {
        const command = new RunAiGenerationCommand(generationId)

        try {
            await this.commandBus.execute<RunAiGenerationCommand, void>(command)
        } catch (error) {
            // Nothing is waiting on this promise, so an unhandled rejection would
            // take the process down. The outcome the athlete sees is already on the
            // row; what reaches here is the command itself failing to complete.
            this.logger.error({ err: error, generationId }, 'in-process AI generation failed')
        }
    }
}
