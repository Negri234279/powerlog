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
     * **Both providers fill this in on the event that opens a subscription**, because
     * neither guarantees we hear about the checkout first. PayPal has no checkout
     * event at all (`BILLING.SUBSCRIPTION.ACTIVATED` is the first we ever hear), and
     * Stripe emits `customer.subscription.created` *before*
     * `checkout.session.completed` — so the handler must be able to create the row
     * from this event alone, whichever one wins the race.
     */
    userId?: string | null
    /** The provider-side customer, when this event opens the subscription. */
    gatewayCustomerId?: string | null
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
 * A charge failed and the provider is retrying — dunning has begun. Stripe
 * reports this on the invoice (`InvoiceEvent.paymentFailed`); PayPal has no
 * invoice to hang it on, so it arrives as its own event. It changes no local
 * state: the provider still considers the subscription active, and says so
 * itself (SUSPENDED) if it gives up. The metric and the "your card failed"
 * notification are the point.
 */
export interface PaymentFailedEvent extends BaseEvent {
    kind: 'payment_failed'
    gatewaySubscriptionId: string
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
    | PaymentFailedEvent
    | UnhandledEvent

/**
 * A journal payload, back as the event the adapter translated.
 *
 * **The journal is JSONB.** Writing it turned every `Date` into a string, and
 * reading it back gives that string — so `payload as GatewayEvent` is a lie whose
 * shape typechecks and whose dates are not dates. It costs nothing until something
 * downstream calls `.toISOString()` on one, which is precisely what replaying a
 * subscription event does.
 *
 * Every path out of the journal comes through here, so a replayed event is
 * indistinguishable from a freshly translated one — the property the replay
 * depends on to be "the same code the live path runs".
 */
export function reviveGatewayEvent(payload: unknown): GatewayEvent {
    const event = payload as GatewayEvent

    switch (event.kind) {
        case 'subscription_changed':
            return {
                ...event,
                currentPeriodStart: new Date(event.currentPeriodStart),
                currentPeriodEnd: new Date(event.currentPeriodEnd),
                canceledAt: event.canceledAt ? new Date(event.canceledAt) : null,
            }

        case 'invoice':
            return {
                ...event,
                issuedAt: new Date(event.issuedAt),
                paidAt: event.paidAt ? new Date(event.paidAt) : null,
            }

        default:
            return event
    }
}
