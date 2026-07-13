import type { InvoiceStatus } from '../../domain/entities/invoice.entity'
import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import type { Currency } from '../../domain/plan-interval'
import type { SubscriptionStatus } from '../../domain/subscription-status'

/**
 * What the app understands about a webhook, once the gateway adapter has verified
 * its signature and translated it.
 *
 * The translation is the point: **no Stripe (or PayPal) type reaches the
 * application layer**. A second provider sending a completely different payload
 * still ends up here, and the handler that updates the subscription is the same
 * one — which is also what makes "cancelled from the provider's own dashboard"
 * take exactly the same path as "cancelled from our UI".
 */

interface BaseEvent {
    gateway: PaymentGateway
    /** The provider's event id — the idempotency key. Replays are a no-op. */
    eventId: string
    /** The provider's event name, kept for the audit row and the metric label. */
    type: string
}

/** A checkout finished paying. The subscription starts existing here. */
export interface CheckoutCompletedEvent extends BaseEvent {
    kind: 'checkout_completed'
    userId: string
    planId: string
    planPriceId: string
    offerId: string | null
    gatewaySubscriptionId: string
    gatewayCustomerId: string | null
}

/** The provider's view of a subscription changed (renewal, dunning, cancellation…). */
export interface SubscriptionChangedEvent extends BaseEvent {
    kind: 'subscription_changed'
    gatewaySubscriptionId: string
    /**
     * Who it belongs to, when the provider tells us.
     *
     * Stripe leaves this null: its `checkout.session.completed` already created the
     * row. **PayPal has no such event** — its `BILLING.SUBSCRIPTION.ACTIVATED` is the
     * first we ever hear of the subscription — so it carries the user id and the
     * handler creates the row from this event instead.
     */
    userId?: string | null
    status: SubscriptionStatus
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    canceledAt: Date | null
    /** The provider-side price it is now on — a plan change landed. */
    gatewayPriceId: string | null
}

/** An invoice to mirror. Both `paid` and `payment_failed` arrive as this. */
export interface InvoiceEvent extends BaseEvent {
    kind: 'invoice'
    gatewayInvoiceId: string
    gatewaySubscriptionId: string | null
    gatewayCustomerId: string | null
    number: string | null
    status: InvoiceStatus
    amountDueCents: number
    amountPaidCents: number
    currency: Currency
    hostedUrl: string | null
    pdfUrl: string | null
    issuedAt: Date
    paidAt: Date | null
    /** True for `invoice.payment_failed` — the user has to be told. */
    paymentFailed: boolean
}

/** A checkout the user walked away from (Stripe expires them after 24h). */
export interface CheckoutExpiredEvent extends BaseEvent {
    kind: 'checkout_expired'
    planSlug: string | null
}

/**
 * Signed, valid, and about something we do not act on. It is still recorded and
 * counted: a provider quietly starting to send a new event type is worth seeing.
 */
export interface UnhandledEvent extends BaseEvent {
    kind: 'unhandled'
}

export type GatewayEvent =
    | CheckoutCompletedEvent
    | SubscriptionChangedEvent
    | InvoiceEvent
    | CheckoutExpiredEvent
    | UnhandledEvent
