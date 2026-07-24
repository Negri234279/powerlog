import { WebhookRetryQueue } from '../../../src/modules/billing/application/ports/webhook-retry-queue.port'
import type { PaymentGateway } from '../../../src/modules/billing/domain/entities/subscription.entity'

/** Recording WebhookRetryQueue double: captures what would have been scheduled,
 *  without any timer or Redis, so tests assert on the intent, not on the wait. */
export class FakeWebhookRetryQueue extends WebhookRetryQueue {
    readonly scheduled: { gateway: PaymentGateway; eventId: string }[] = []

    async enqueue(gateway: PaymentGateway, eventId: string): Promise<void> {
        this.scheduled.push({ gateway, eventId })
    }
}
