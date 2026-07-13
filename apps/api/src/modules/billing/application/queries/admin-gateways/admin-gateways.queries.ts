import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import type { WebhookEventStatus } from '../../ports/webhook-event.store'

/** Health of each payment integration: configured, synced, last webhook, failures. */
export class AdminGatewayStatusQuery {}

/** The webhook journal, for the admin panel (and its retry button). */
export class AdminWebhookEventsQuery {
    constructor(
        readonly status: WebhookEventStatus | undefined,
        readonly gateway: PaymentGateway | undefined,
        readonly limit: number,
        readonly offset: number,
    ) {}
}

/**
 * Run the reconciliation now. The same comparison the hourly probe publishes as
 * `powerlog_billing_drift` — here so an operator can ask for it after fixing
 * something, instead of waiting an hour to find out whether it worked.
 */
export class AdminBillingDriftQuery {}
