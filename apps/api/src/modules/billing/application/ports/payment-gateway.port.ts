import type { PlanOfferEntity } from '../../domain/entities/plan-offer.entity'
import type { PlanPriceEntity } from '../../domain/entities/plan-price.entity'
import type { PlanAggregate } from '../../domain/entities/plan.entity'
import type { PaymentGateway as GatewayName, SubscriptionAggregate } from '../../domain/entities/subscription.entity'
import type { GatewayEvent } from './gateway-event'

/**
 * What the app needs from a payment provider — and nothing more. Stripe and
 * PayPal each implement it; **no other file in the codebase names either of
 * them**, which is what lets a second provider land without touching a handler.
 *
 * Two rules the implementations share:
 *  - **The gateway owns the money, we own the projection.** Every method here
 *    changes something over there; the local row is updated by the webhook that
 *    comes back, not by the return value. That way the app converges on the same
 *    state whether the change was made from here or from the provider's own
 *    dashboard.
 *  - **Idempotency is the caller's problem, not the port's.** Handlers guard the
 *    preconditions; the port just does what it is told.
 */

/** The ids a plan's catalog sync produced on the provider's side. */
export interface PlanSyncResult {
    /** The provider's product (Stripe Product / PayPal Product). */
    productId: string
    /** Price id per local price id — what a checkout is started against. */
    priceIds: Record<string, string>
    /** The coupon/discount implementing the offer's intro phase, if there is one. */
    offerDiscountId?: string | null
}

export interface CheckoutRequest {
    userId: string
    /** Where they land after paying / after backing out. */
    successUrl: string
    cancelUrl: string
    plan: PlanAggregate
    price: PlanPriceEntity
    offer?: PlanOfferEntity | null
    /** The provider-side customer this user already is, if any. */
    customerId?: string | null
    /** Shown on the provider's page when there is no customer yet. */
    email: string
}

/** How a plan change is billed. Decided by the handler, applied by the gateway. */
export type PlanChangeMode =
    /** Charge the difference now and switch immediately. */
    | 'immediate_proration'
    /** Keep the current plan until the period ends, then switch. */
    | 'at_period_end'

export abstract class PaymentGatewayPort {
    /** Which provider this is — the enum stored on subscriptions and metrics. */
    abstract readonly name: GatewayName

    /** False when this environment has no keys for it. Checkout must not offer it. */
    abstract isConfigured(): boolean

    /**
     * Push a plan, its sellable prices and (optionally) its offer to the provider,
     * returning the ids to store. Re-runnable: a plan already synced keeps its
     * product and only gains the prices that are missing — prices are immutable on
     * both sides, so this can never rewrite one someone is paying.
     */
    abstract syncPlan(
        plan: PlanAggregate,
        prices: PlanPriceEntity[],
        offer?: PlanOfferEntity | null,
    ): Promise<PlanSyncResult>

    /** Start a checkout; returns the URL to send the browser to. */
    abstract createCheckout(request: CheckoutRequest): Promise<string>

    /**
     * Stop it renewing. The user keeps the plan until `currentPeriodEnd` — every
     * provider models this natively, and it is the only cancellation we do.
     */
    abstract cancelAtPeriodEnd(subscription: SubscriptionAggregate): Promise<void>

    /** Undo a scheduled cancellation, while the period it paid for is still running. */
    abstract resume(subscription: SubscriptionAggregate): Promise<void>

    /** Move a live subscription to another price. */
    abstract changePlan(
        subscription: SubscriptionAggregate,
        newPrice: PlanPriceEntity,
        mode: PlanChangeMode,
    ): Promise<void>

    /**
     * A URL where the user manages their payment method and invoices, or null if
     * the provider has no such thing (PayPal: they use paypal.com). The button
     * only shows when this returns something.
     */
    abstract billingPortalUrl(subscription: SubscriptionAggregate, returnUrl: string): Promise<string | null>

    /**
     * Verify an inbound webhook against **the raw body** and translate it into a
     * {@link GatewayEvent}. Throws if the signature does not check out — an
     * unsigned payload is somebody claiming a payment happened.
     *
     * The raw bytes matter: the signature covers the exact body the provider sent,
     * so a JSON round-trip (parse → re-serialize) invalidates it.
     */
    abstract verifyWebhook(rawBody: Buffer, signature: string): GatewayEvent
}
