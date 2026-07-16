import { Injectable, type OnApplicationShutdown } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import type { PinoLogger } from 'nestjs-pino'

import { RetryFailedWebhookCommand } from '../../application/commands/retry-failed-webhook/retry-failed-webhook.command'
import { BillingMetrics } from '../../application/ports/billing-metrics.port'
import { WebhookRetryQueue } from '../../application/ports/webhook-retry-queue.port'
import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import { RETRY_ATTEMPTS, backoffDelayMs } from './webhook-retry.constants'

/**
 * The fallback when `REDIS_URL` is unset (dev without Docker, the test suites, a
 * single-replica deploy that opts out of Redis): the same backoff schedule kept on
 * in-process timers.
 *
 * It is weaker than BullMQ on purpose — retries do not survive a restart and do not
 * coordinate across replicas — but it keeps the safety net working with no infra,
 * and the deterministic on-creation invoice recovery does not depend on it at all.
 */
@Injectable()
export class InProcessWebhookRetryQueue extends WebhookRetryQueue implements OnApplicationShutdown {
    private readonly pending = new Map<string, NodeJS.Timeout>()

    constructor(
        private readonly commandBus: CommandBus,
        private readonly metrics: BillingMetrics,
        private readonly logger: PinoLogger,
    ) {
        super()
        this.logger.setContext(InProcessWebhookRetryQueue.name)
    }

    async enqueue(gateway: PaymentGateway, eventId: string): Promise<void> {
        const key = `${gateway}:${eventId}`
        // Already waiting: collapse into the run in flight, like BullMQ's jobId does.
        if (this.pending.has(key)) return

        this.metrics.recordWebhookRetry(gateway, 'scheduled')
        this.schedule(gateway, eventId, key, 1)
    }

    private schedule(gateway: PaymentGateway, eventId: string, key: string, attempt: number): void {
        const timer = setTimeout(() => {
            void this.attempt(gateway, eventId, key, attempt)
        }, backoffDelayMs(attempt))
        // Never keep the process alive just to run a retry.
        timer.unref()

        this.pending.set(key, timer)
    }

    private async attempt(gateway: PaymentGateway, eventId: string, key: string, attempt: number): Promise<void> {
        this.pending.delete(key)

        try {
            const command = new RetryFailedWebhookCommand(gateway, eventId)
            await this.commandBus.execute<RetryFailedWebhookCommand, void>(command)
        } catch (error) {
            if (attempt >= RETRY_ATTEMPTS) {
                this.metrics.recordWebhookRetry(gateway, 'exhausted')
                this.logger.error(
                    { gateway, eventId, err: error },
                    'billing webhook retries exhausted — left failed for admin replay',
                )

                return
            }

            this.schedule(gateway, eventId, key, attempt + 1)
        }
    }

    onApplicationShutdown(): void {
        for (const timer of this.pending.values()) clearTimeout(timer)
        this.pending.clear()
    }
}
