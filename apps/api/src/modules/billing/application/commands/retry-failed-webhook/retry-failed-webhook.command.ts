import type { PaymentGateway } from '../../../domain/entities/subscription.entity'

/**
 * Retry a webhook that failed, identified by the pair that survives a replay
 * (`id` changes when the row is reopened, `(gateway, eventId)` does not). Issued by
 * the {@link WebhookRetryQueue} worker on each backoff tick.
 */
export class RetryFailedWebhookCommand {
    constructor(
        readonly gateway: PaymentGateway,
        readonly eventId: string,
    ) {}
}
