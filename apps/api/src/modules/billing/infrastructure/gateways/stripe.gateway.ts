import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PinoLogger } from 'nestjs-pino'
import Stripe from 'stripe'

import type { Env } from '../../../../config/env'
import { BillingMetrics, type GatewayOperation } from '../../application/ports/billing-metrics.port'
import type { GatewayEvent } from '../../application/ports/gateway-event'
import {
    type CheckoutRequest,
    PaymentGatewayPort,
    type PlanChangeMode,
    type PlanSyncResult,
} from '../../application/ports/payment-gateway.port'
import type { InvoiceStatus } from '../../domain/entities/invoice.entity'
import type { PlanOfferEntity } from '../../domain/entities/plan-offer.entity'
import type { PlanPriceEntity } from '../../domain/entities/plan-price.entity'
import type { PlanAggregate } from '../../domain/entities/plan.entity'
import type { PaymentGateway, SubscriptionAggregate } from '../../domain/entities/subscription.entity'
import type { SubscriptionStatus } from '../../domain/subscription-status'
import type { Currency } from '../../domain/plan-interval'
import {
    GatewayNotConfiguredError,
    GatewayRequestFailedError,
    PlanSyncFailedError,
    PriceNotSyncedError,
} from '../../domain/errors/billing.errors'
import { type PlanInterval, monthsIn } from '../../domain/plan-interval'

/**
 * Our billing periods, as Stripe bills them. Stripe has no "quarter": it has an
 * interval plus a count, so a quarter is three months.
 */
function recurring(interval: PlanInterval): { interval: 'month' | 'year'; interval_count: number } {
    if (interval === 'year') return { interval: 'year', interval_count: 1 }

    return { interval: 'month', interval_count: monthsIn(interval) }
}

/**
 * Stripe, behind the {@link PaymentGatewayPort}. The only file in the codebase
 * that imports the Stripe SDK.
 *
 * **Two API changes that bite** (verified against SDK 22 / API `2026-06-24`), and
 * that the webhook mapping has to know:
 *  - `current_period_start/end` are **no longer on the Subscription** — they live
 *    on each subscription item. Reading `subscription.current_period_end` is not a
 *    type error in plain JS: it is `undefined`, and `new Date(undefined * 1000)`
 *    quietly becomes an invalid date.
 *  - `invoice.subscription` is gone too; an invoice points at its subscription
 *    through `invoice.parent.subscription_details.subscription`.
 *
 * With no `STRIPE_SECRET_KEY` the client is never built and `isConfigured()` is
 * false: the app runs in free/manual mode and checkout refuses cleanly, exactly
 * like the Redis-less mode.
 */
@Injectable()
export class StripeGateway extends PaymentGatewayPort {
    readonly name: PaymentGateway = 'stripe'

    private readonly client: Stripe | null
    private readonly webhookSecret: string

    constructor(
        config: ConfigService<Env, true>,
        private readonly metrics: BillingMetrics,
        private readonly logger: PinoLogger,
    ) {
        super()
        this.logger.setContext(StripeGateway.name)

        this.webhookSecret = config.get('STRIPE_WEBHOOK_SECRET', { infer: true })
        const key = config.get('STRIPE_SECRET_KEY', { infer: true })
        // The SDK pins its own API version; we do not override it, so the types in
        // this file and the payloads Stripe sends always describe the same API.
        this.client = key ? new Stripe(key) : null

        if (!this.client) {
            this.logger.info('STRIPE_SECRET_KEY not set — Stripe checkout is not offered')
        }
    }

    isConfigured(): boolean {
        return this.client !== null
    }

    /** Stripe models cancel-at-period-end natively, so a cancellation is undoable. */
    get supportsResume(): boolean {
        return true
    }

    async syncPlan(
        plan: PlanAggregate,
        prices: PlanPriceEntity[],
        offer?: PlanOfferEntity | null,
    ): Promise<PlanSyncResult> {
        const stripe = this.require()

        try {
            const result = await this.timed('sync', async () => {
                // One Stripe Product per plan; re-syncing an already-published plan
                // updates its name instead of creating a second product.
                const existingProduct = plan.productIdOn('stripe')
                const product = existingProduct
                    ? await stripe.products.update(existingProduct, {
                          name: plan.name,
                          ...(plan.description ? { description: plan.description } : {}),
                      })
                    : await stripe.products.create({
                          name: plan.name,
                          ...(plan.description ? { description: plan.description } : {}),
                          metadata: { plan: plan.slug },
                      })

                const priceIds: Record<string, string> = {}
                for (const price of prices) {
                    // A price is immutable on both sides, so an already-synced one is
                    // never touched: that row is what somebody is being billed on.
                    const existing = price.externalIdOn('stripe')
                    if (existing) {
                        priceIds[price.id] = existing
                        continue
                    }

                    const created = await stripe.prices.create({
                        product: product.id,
                        currency: price.currency.toLowerCase(),
                        unit_amount: price.amountCents,
                        recurring: recurring(price.interval),
                        metadata: { plan: plan.slug, priceId: price.id },
                    })
                    priceIds[price.id] = created.id
                }

                return {
                    productId: product.id,
                    priceIds,
                    offer: offer ? { discountId: await this.syncOffer(stripe, plan, offer) } : null,
                }
            })

            this.metrics.recordPlanSync('stripe', 'ok')
            this.logger.info({ plan: plan.slug, product: result.productId }, 'plan synced to stripe')

            return result
        } catch (error) {
            this.metrics.recordPlanSync('stripe', 'error')
            throw new PlanSyncFailedError('stripe', message(error))
        }
    }

    /**
     * The intro phase, as a Stripe coupon. The trial is NOT a coupon — it rides on
     * the checkout session — so an offer that is only a trial produces none.
     *
     * A percentage is what makes one coupon enough: it means the same thing against
     * every price of the plan (EUR and USD, monthly and yearly). Stripe coupons are
     * immutable, so an offer that already has one keeps it — changing the discount
     * means a new offer, not an edited one.
     */
    private async syncOffer(stripe: Stripe, plan: PlanAggregate, offer: PlanOfferEntity): Promise<string | null> {
        const intro = offer.introPhase
        if (!intro) return null
        if (offer.stripeCouponId) return offer.stripeCouponId

        const coupon = await stripe.coupons.create({
            name: offer.name,
            duration: 'repeating',
            duration_in_months: intro.cycles,
            percent_off: intro.percentOff,
            metadata: { plan: plan.slug, offerId: offer.id },
        })

        return coupon.id
    }

    async createCheckout(request: CheckoutRequest): Promise<string> {
        const stripe = this.require()
        const priceId = request.price.externalIdOn('stripe')
        // Never send someone to a checkout for a price the provider has never heard
        // of: they would land on an error page with their card out.
        if (!priceId) throw new PriceNotSyncedError()

        const offer = request.offer

        const session = await this.call('checkout', () =>
            stripe.checkout.sessions.create({
                mode: 'subscription',
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: request.successUrl,
                cancel_url: request.cancelUrl,
                ...(request.customerId ? { customer: request.customerId } : { customer_email: request.email }),
                // How the webhook knows who this belongs to. The subscription row is
                // created from the event, not from the redirect — a user who closes
                // the tab after paying must still end up subscribed.
                client_reference_id: request.userId,
                metadata: {
                    userId: request.userId,
                    planId: request.plan.id,
                    priceId: request.price.id,
                    ...(offer ? { offerId: offer.id } : {}),
                },
                subscription_data: {
                    metadata: { userId: request.userId, planId: request.plan.id, priceId: request.price.id },
                    ...(offer?.trialDays ? { trial_period_days: offer.trialDays } : {}),
                },
                ...(offer?.stripeCouponId ? { discounts: [{ coupon: offer.stripeCouponId }] } : {}),
            }),
        )

        if (!session.url) throw new GatewayRequestFailedError('stripe', 'checkout session has no URL')

        return session.url
    }

    async cancelAtPeriodEnd(subscription: SubscriptionAggregate): Promise<void> {
        const stripe = this.require()

        await this.call('cancel', () =>
            stripe.subscriptions.update(this.gatewayIdOf(subscription), { cancel_at_period_end: true }),
        )
    }

    async resume(subscription: SubscriptionAggregate): Promise<void> {
        const stripe = this.require()

        await this.call('resume', () =>
            stripe.subscriptions.update(this.gatewayIdOf(subscription), { cancel_at_period_end: false }),
        )
    }

    async changePlan(
        subscription: SubscriptionAggregate,
        newPrice: PlanPriceEntity,
        mode: PlanChangeMode,
    ): Promise<string | null> {
        const stripe = this.require()
        const priceId = newPrice.externalIdOn('stripe')
        if (!priceId) throw new PriceNotSyncedError()

        await this.call('change_plan', async () => {
            const id = this.gatewayIdOf(subscription)
            // The item id is not stored locally: Stripe is the source of truth for
            // what the subscription is made of, and one extra read is cheaper than a
            // column that can go stale.
            const current = await stripe.subscriptions.retrieve(id)
            const item = current.items.data[0]
            if (!item) throw new GatewayRequestFailedError('stripe', 'subscription has no items')

            return stripe.subscriptions.update(id, {
                items: [{ id: item.id, price: priceId }],
                // An upgrade is charged now, pro-rated. A downgrade waits for the
                // period the user already paid for to run out — taking money back is
                // not something this app does.
                proration_behavior: mode === 'immediate_proration' ? 'create_prorations' : 'none',
                ...(mode === 'at_period_end' ? { billing_cycle_anchor: 'unchanged' as const } : {}),
            })
        })

        // Stripe applies it on its own — the user does not have to approve anything.
        return null
    }

    async billingPortalUrl(subscription: SubscriptionAggregate, returnUrl: string): Promise<string | null> {
        const stripe = this.require()
        const customer = subscription.gatewayCustomerId
        if (!customer) return null

        const session = await this.call('portal', () =>
            stripe.billingPortal.sessions.create({ customer, return_url: returnUrl }),
        )

        return session.url
    }

    /**
     * Verify the signature against the **raw bytes** and translate the event.
     *
     * With no `STRIPE_WEBHOOK_SECRET` this refuses everything: an unsigned payload
     * is somebody claiming a payment happened, and taking their word for it would
     * hand out paid plans for free.
     */
    async verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<GatewayEvent> {
        const stripe = this.require()
        const secret = this.webhookSecret
        const signature = headers['stripe-signature']
        if (!secret || !signature) throw new GatewayNotConfiguredError('stripe')

        // Local HMAC over the raw bytes. Throws on a bad signature or a stale
        // timestamp (replay protection) — no network call, unlike PayPal.
        const event = stripe.webhooks.constructEvent(rawBody, signature, secret)

        return this.translate(event)
    }

    private translate(event: Stripe.Event): GatewayEvent {
        const base = { gateway: 'stripe' as const, eventId: event.id, type: event.type }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const metadata = session.metadata ?? {}
                const userId = session.client_reference_id ?? metadata['userId']
                const subscriptionId = idOf(session.subscription)

                // A session with no subscription is not a subscription checkout; one
                // with no user is one we did not start. Neither is actionable.
                if (!userId || !subscriptionId || !metadata['planId'] || !metadata['priceId']) {
                    return { ...base, kind: 'unhandled' }
                }

                return {
                    ...base,
                    kind: 'checkout_completed',
                    userId,
                    planId: metadata['planId'],
                    planPriceId: metadata['priceId'],
                    offerId: metadata['offerId'] ?? null,
                    gatewaySubscriptionId: subscriptionId,
                    gatewayCustomerId: idOf(session.customer),
                }
            }

            case 'checkout.session.expired': {
                const session = event.data.object

                return { ...base, kind: 'checkout_expired', planSlug: session.metadata?.['planSlug'] ?? null }
            }

            // `created` is not a nicety: a checkout that pays immediately is born
            // `active` and Stripe never sends `updated` for it. Without this case the
            // subscription would sit `incomplete` forever, waiting for an event that
            // is never coming — and it arrives BEFORE `checkout.session.completed`,
            // so it also has to be able to open the row on its own.
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                const item = subscription.items.data[0]

                return {
                    ...base,
                    kind: 'subscription_changed',
                    gatewaySubscriptionId: subscription.id,
                    // Put there by `createCheckout` via `subscription_data.metadata`,
                    // for exactly this: whichever event lands first knows the owner.
                    userId: subscription.metadata?.['userId'] ?? null,
                    gatewayCustomerId: idOf(subscription.customer),
                    status: statusOf(subscription.status),
                    // The period lives on the ITEM in this API version, not on the
                    // subscription — see the class comment. Reading it off the
                    // subscription yields undefined and an invalid date.
                    currentPeriodStart: secondsToDate(item?.current_period_start),
                    currentPeriodEnd: secondsToDate(item?.current_period_end),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    canceledAt: subscription.canceled_at ? secondsToDate(subscription.canceled_at) : null,
                    gatewayPriceId: item?.price?.id ?? null,
                }
            }

            case 'invoice.paid':
            case 'invoice.payment_failed': {
                const invoice = event.data.object
                const currency = invoice.currency.toUpperCase()

                return {
                    ...base,
                    kind: 'invoice',
                    gatewayInvoiceId: invoice.id ?? '',
                    // `invoice.subscription` no longer exists: an invoice points at its
                    // subscription through its `parent`.
                    gatewaySubscriptionId: idOf(invoice.parent?.subscription_details?.subscription ?? null),
                    gatewayCustomerId: idOf(invoice.customer),
                    number: invoice.number ?? null,
                    status: (invoice.status ?? 'open') as InvoiceStatus,
                    amountDueCents: invoice.amount_due,
                    amountPaidCents: invoice.amount_paid,
                    currency: (currency === 'USD' ? 'USD' : 'EUR') as Currency,
                    hostedUrl: invoice.hosted_invoice_url ?? null,
                    pdfUrl: invoice.invoice_pdf ?? null,
                    issuedAt: secondsToDate(invoice.created),
                    paidAt: event.type === 'invoice.paid' ? secondsToDate(invoice.created) : null,
                    paymentFailed: event.type === 'invoice.payment_failed',
                }
            }

            default:
                // Signed and valid, but not something we act on. It is still recorded
                // and counted — a provider starting to send something new is worth seeing.
                return { ...base, kind: 'unhandled' }
        }
    }

    /** Everything Stripe is still billing, paged through in full. */
    async listLiveSubscriptionIds(): Promise<string[] | null> {
        const stripe = this.require()
        const ids: string[] = []

        // `status: 'all'` would include the finished ones; what we want is what Stripe
        // still considers alive, which is exactly what our own "live" statuses mean.
        for (const status of ['active', 'trialing', 'past_due'] as const) {
            for await (const subscription of stripe.subscriptions.list({ status, limit: 100 })) {
                ids.push(subscription.id)
            }
        }

        return ids
    }

    private require(): Stripe {
        if (!this.client) throw new GatewayNotConfiguredError('stripe')

        return this.client
    }

    private gatewayIdOf(subscription: SubscriptionAggregate): string {
        const id = subscription.gatewaySubscriptionId
        if (!id) throw new GatewayRequestFailedError('stripe', 'subscription is not linked to Stripe')

        return id
    }

    /** Times the call and turns any Stripe failure into a domain error. */
    private async call<T>(operation: GatewayOperation, run: () => Promise<T>): Promise<T> {
        try {
            return await this.timed(operation, run)
        } catch (error) {
            // Our own domain errors (a missing price id, say) pass through as they are.
            if (error instanceof GatewayRequestFailedError || error instanceof PriceNotSyncedError) throw error

            this.logger.error({ operation, err: error }, 'stripe request failed')
            throw new GatewayRequestFailedError('stripe', message(error))
        }
    }

    private async timed<T>(operation: GatewayOperation, run: () => Promise<T>): Promise<T> {
        const startedAt = Date.now()
        try {
            const result = await run()
            this.metrics.recordGatewayCall('stripe', operation, 'ok', (Date.now() - startedAt) / 1000)

            return result
        } catch (error) {
            this.metrics.recordGatewayCall('stripe', operation, 'error', (Date.now() - startedAt) / 1000)
            throw error
        }
    }
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error'
}

/** Stripe returns either an id or the expanded object; we only ever want the id. */
function idOf(value: string | { id: string } | null | undefined): string | null {
    if (!value) return null

    return typeof value === 'string' ? value : value.id
}

/** Stripe timestamps are seconds; JS wants milliseconds. */
function secondsToDate(seconds: number | null | undefined): Date {
    return new Date((seconds ?? 0) * 1000)
}

/**
 * Stripe's subscription statuses, as ours. `unpaid` is Stripe having given up on
 * collecting: for us that is the end of the subscription, not another retry.
 */
function statusOf(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
        case 'trialing':
            return 'trialing'
        case 'active':
            return 'active'
        case 'past_due':
            return 'past_due'
        case 'canceled':
            return 'canceled'
        case 'unpaid':
            return 'expired'
        case 'incomplete':
        case 'incomplete_expired':
        case 'paused':
            return 'incomplete'
        default:
            return 'incomplete'
    }
}
