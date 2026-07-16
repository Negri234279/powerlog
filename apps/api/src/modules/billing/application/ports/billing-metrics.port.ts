import type { PaymentGateway } from '../../domain/entities/subscription.entity'

/** The outgoing calls worth timing separately (they fail in different ways). */
export type GatewayOperation = 'sync' | 'checkout' | 'cancel' | 'resume' | 'change_plan' | 'portal'

export type CallStatus = 'ok' | 'error'

/** Where a checkout got to. `started` here, the rest by webhook. */
export type CheckoutStatus = 'started' | 'completed' | 'expired'

/** The lifecycle of a subscription, as it actually happened. */
export type SubscriptionEvent =
    | 'activated'
    | 'renewed'
    | 'upgraded'
    | 'downgraded'
    | 'canceled'
    | 'resumed'
    | 'payment_failed'
    | 'expired'

/** What became of an inbound webhook. `duplicate` proves the idempotency works. */
export type WebhookStatus = 'processed' | 'failed' | 'duplicate'

/** A backoff retry was `scheduled`, or gave up after the last attempt (`exhausted`). */
export type WebhookRetryOutcome = 'scheduled' | 'exhausted'

/**
 * Billing observability, behind a port so the handlers stay free of prom-client.
 * Deliberately narrow: everything the CQRS histograms already count (rate and
 * failures per command) is NOT repeated here.
 *
 * Label cardinality is bounded by construction: `gateway`/`status`/`operation`
 * are enums and `plan` is a catalog slug (a few dozen, all admin-created). Never
 * a user id, never a gateway id.
 */
export abstract class BillingMetrics {
    /** Latency and failures of the outgoing calls to the provider. */
    abstract recordGatewayCall(
        gateway: PaymentGateway,
        operation: GatewayOperation,
        status: CallStatus,
        seconds: number,
    ): void

    /** Catalog publications that failed against the provider. */
    abstract recordPlanSync(gateway: PaymentGateway, status: CallStatus): void

    /** The checkout funnel, by gateway and plan. */
    abstract recordCheckout(gateway: PaymentGateway, plan: string, status: CheckoutStatus): void

    /** The subscription lifecycle — churn and dunning recovery are derived from this. */
    abstract recordSubscriptionEvent(event: SubscriptionEvent, gateway: PaymentGateway): void

    /** Signups that came in through an offer: do the promos convert? */
    abstract recordOfferRedemption(plan: string): void

    /** Health of the channel everything else depends on. */
    abstract recordWebhook(gateway: PaymentGateway, type: string, status: WebhookStatus): void

    /** Backoff retries of failed webhooks. `exhausted` is the one to alert on: a
     *  webhook that never recovered on its own and is waiting for a human. */
    abstract recordWebhookRetry(gateway: PaymentGateway, outcome: WebhookRetryOutcome): void
}
