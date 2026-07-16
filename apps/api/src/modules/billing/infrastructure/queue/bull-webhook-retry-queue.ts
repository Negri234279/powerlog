import { Injectable } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import type { Job, Queue, Worker } from 'bullmq'
import type { PinoLogger } from 'nestjs-pino'

import { BullQueueFactory } from '../../../../queue/bull-queue.factory'
import { RetryFailedWebhookCommand } from '../../application/commands/retry-failed-webhook/retry-failed-webhook.command'
import { BillingMetrics } from '../../application/ports/billing-metrics.port'
import { WebhookRetryQueue } from '../../application/ports/webhook-retry-queue.port'
import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import { RETRY_ATTEMPTS, RETRY_BACKOFF_MS } from './webhook-retry.constants'

const QUEUE_NAME = 'billing-webhook-retry'

interface RetryJob {
    gateway: PaymentGateway
    eventId: string
}

/**
 * The durable retry queue: BullMQ on Redis, so a scheduled retry survives a
 * restart and only one replica runs each attempt.
 *
 * The connections and their shutdown are the shared {@link BullQueueFactory}'s job;
 * this class owns only what is billing's: the queue name, the backoff policy, the
 * `(gateway, eventId)` job, and the processor that replays it through the same
 * pipeline the live webhook does ({@link RetryFailedWebhookCommand}).
 */
@Injectable()
export class BullWebhookRetryQueue extends WebhookRetryQueue {
    private readonly queue: Queue<RetryJob>
    private readonly worker: Worker<RetryJob>

    constructor(
        queues: BullQueueFactory,
        private readonly commandBus: CommandBus,
        private readonly metrics: BillingMetrics,
        private readonly logger: PinoLogger,
    ) {
        super()
        this.logger.setContext(BullWebhookRetryQueue.name)

        this.queue = queues.createQueue<RetryJob>(QUEUE_NAME)
        this.worker = queues.createWorker<RetryJob>(QUEUE_NAME, (job) => this.process(job))

        this.worker.on('failed', (job, error) => {
            // Only the *last* attempt is a dead-letter; the earlier ones are the
            // backoff doing its job and are not worth alerting on.
            const exhausted = !job || job.attemptsMade >= (job.opts.attempts ?? 1)
            if (!exhausted) return

            this.metrics.recordWebhookRetry(job?.data.gateway ?? 'stripe', 'exhausted')
            this.logger.error(
                { gateway: job?.data.gateway, eventId: job?.data.eventId, err: error },
                'billing webhook retries exhausted — left failed for admin replay',
            )
        })
        this.worker.on('error', (error) => {
            this.logger.error({ err: error }, 'billing webhook retry worker error')
        })
    }

    async enqueue(gateway: PaymentGateway, eventId: string): Promise<void> {
        // `jobId` is the dedupe: while a retry for this event is still pending, a
        // second enqueue (a gateway resend, another replica) collapses into it.
        await this.queue.add(
            'retry',
            { gateway, eventId },
            {
                jobId: `${gateway}:${eventId}`,
                attempts: RETRY_ATTEMPTS,
                backoff: { type: 'exponential', delay: RETRY_BACKOFF_MS },
                // Bounded so a `noeviction` Redis never grows without limit.
                removeOnComplete: { age: 3_600, count: 1_000 },
                removeOnFail: { age: 24 * 3_600 },
            },
        )

        this.metrics.recordWebhookRetry(gateway, 'scheduled')
    }

    private async process(job: Job<RetryJob>): Promise<void> {
        const command = new RetryFailedWebhookCommand(job.data.gateway, job.data.eventId)
        await this.commandBus.execute<RetryFailedWebhookCommand, void>(command)
    }
}
