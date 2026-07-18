import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PinoLogger } from 'nestjs-pino'

import type { Env } from '../../../../config/env'
import { BillingMetrics, type GatewayOperation } from '../../application/ports/billing-metrics.port'
import type { GatewayEvent } from '../../application/ports/gateway-event'
import {
    type CheckoutRequest,
    type CheckoutSession,
    PaymentGatewayPort,
    type PlanChangeMode,
    type PlanSyncResult,
} from '../../application/ports/payment-gateway.port'
import type { PlanOfferEntity } from '../../domain/entities/plan-offer.entity'
import type { PlanPriceEntity } from '../../domain/entities/plan-price.entity'
import type { PlanAggregate } from '../../domain/entities/plan.entity'
import type { PaymentGateway, SubscriptionAggregate } from '../../domain/entities/subscription.entity'
import {
    GatewayNotConfiguredError,
    GatewayRequestFailedError,
    PlanSyncFailedError,
    PriceNotSyncedError,
    ResumeNotSupportedError,
} from '../../domain/errors/billing.errors'
import { type Currency, type PlanInterval, monthsIn } from '../../domain/plan-interval'
import type { SubscriptionStatus } from '../../domain/subscription-status'
import { PayPalClient } from './paypal.client'

const LIVE = 'https://api-m.paypal.com'
const SANDBOX = 'https://api-m.sandbox.paypal.com'

/** PayPal bills in a unit + count, like Stripe. A quarter is three months. */
function frequency(interval: PlanInterval): { interval_unit: 'MONTH' | 'YEAR'; interval_count: number } {
    if (interval === 'year') return { interval_unit: 'YEAR', interval_count: 1 }

    return { interval_unit: 'MONTH', interval_count: monthsIn(interval) }
}

/** PayPal takes decimal strings, not cents. */
function amount(cents: number, currency: Currency) {
    return { value: (cents / 100).toFixed(2), currency_code: currency }
}

/**
 * PayPal, behind the same {@link PaymentGatewayPort} as Stripe. The rest of the
 * app cannot tell them apart — but they are not the same shape underneath, and
 * these are the three differences that actually matter:
 *
 *  1. **An offer is not a discount, it is a different plan.** PayPal has no
 *     coupons: a trial and an intro price are *billing cycles inside the plan*. So
 *     an offer gets its own PayPal plan per price, and a checkout on the offer
 *     points at that plan instead. (`plan_offers.paypal_plan_ids`.)
 *  2. **Cancellation is terminal.** There is no cancel-at-period-end and no undo:
 *     `supportsResume` is false and the UI does not offer the button. Our
 *     entitlement rule still gives the user the time they paid for — a cancelled
 *     subscription keeps its plan until `currentPeriodEnd`.
 *  3. **A plan change needs the user's approval again.** `revise` returns an
 *     approval link; `changePlan` hands it back and the browser goes there.
 *
 * And one that bites in operations: **a webhook is authenticated by asking
 * PayPal**, not by a local HMAC. Without `PAYPAL_WEBHOOK_ID` nothing can be
 * verified, so the endpoint refuses everything.
 */
@Injectable()
export class PayPalGateway extends PaymentGatewayPort {
    readonly name: PaymentGateway = 'paypal'

    private readonly client: PayPalClient | null
    private readonly webhookId: string

    constructor(
        config: ConfigService<Env, true>,
        private readonly metrics: BillingMetrics,
        private readonly logger: PinoLogger,
    ) {
        super()
        this.logger.setContext(PayPalGateway.name)

        const clientId = config.get('PAYPAL_CLIENT_ID', { infer: true })
        const clientSecret = config.get('PAYPAL_CLIENT_SECRET', { infer: true })
        this.webhookId = config.get('PAYPAL_WEBHOOK_ID', { infer: true })
        const baseUrl = config.get('PAYPAL_ENV', { infer: true }) === 'live' ? LIVE : SANDBOX

        this.client = clientId && clientSecret ? new PayPalClient(baseUrl, clientId, clientSecret) : null

        if (!this.client) {
            this.logger.info('PAYPAL_CLIENT_ID/SECRET not set — PayPal checkout is not offered')
        }
    }

    isConfigured(): boolean {
        return this.client !== null
    }

    /** PayPal cancellation is terminal: there is nothing to resume. */
    get supportsResume(): boolean {
        return false
    }

    async syncPlan(
        plan: PlanAggregate,
        prices: PlanPriceEntity[],
        offer?: PlanOfferEntity | null,
    ): Promise<PlanSyncResult> {
        const paypal = this.require()

        try {
            return await this.timed('sync', async () => {
                const productId = plan.productIdOn('paypal') ?? (await this.createProduct(paypal, plan))

                const priceIds: Record<string, string> = {}
                for (const price of prices) {
                    // Immutable on both sides: an already-published price keeps its plan,
                    // because that is what somebody is being billed on.
                    const existing = price.externalIdOn('paypal')
                    priceIds[price.id] = existing ?? (await this.createBillingPlan(paypal, productId, plan, price))
                }

                // The offer's trial/intro cycles live *inside* a plan, so it needs plans
                // of its own — one per price.
                const offerPriceIds: Record<string, string> = {}
                if (offer) {
                    for (const price of prices) {
                        offerPriceIds[price.id] =
                            offer.paypalPlanFor(price.id) ??
                            (await this.createBillingPlan(paypal, productId, plan, price, offer))
                    }
                }

                this.metrics.recordPlanSync('paypal', 'ok')
                this.logger.info({ plan: plan.slug, product: productId }, 'plan synced to paypal')

                return {
                    productId,
                    priceIds,
                    offer: offer ? { priceIds: offerPriceIds } : null,
                }
            })
        } catch (error) {
            this.metrics.recordPlanSync('paypal', 'error')
            throw new PlanSyncFailedError('paypal', message(error))
        }
    }

    private async createProduct(paypal: PayPalClient, plan: PlanAggregate): Promise<string> {
        const product = await paypal.post<{ id: string }>(
            '/v1/catalogs/products',
            {
                name: plan.name,
                ...(plan.description ? { description: plan.description } : {}),
                type: 'SERVICE',
                category: 'SOFTWARE',
            },
            // A sync that created the product but died before recording its id must
            // not mint a second one on the retry: PayPal replays the first answer.
            { 'PayPal-Request-Id': `powerlog-product-${plan.id}` },
        )

        return product.id
    }

    /**
     * A PayPal billing plan. With an offer, the trial days and the discounted
     * cycles go **in front of** the regular cycle — so when they run out PayPal
     * starts charging the real price by itself, and nothing here has to remember.
     */
    private async createBillingPlan(
        paypal: PayPalClient,
        productId: string,
        plan: PlanAggregate,
        price: PlanPriceEntity,
        offer?: PlanOfferEntity,
    ): Promise<string> {
        const cycles: unknown[] = []
        let sequence = 1

        if (offer?.trialDays) {
            cycles.push({
                tenure_type: 'TRIAL',
                sequence: sequence++,
                total_cycles: 1,
                frequency: { interval_unit: 'DAY', interval_count: offer.trialDays },
                pricing_scheme: { fixed_price: amount(0, price.currency) },
            })
        }

        const intro = offer?.introPhase
        if (intro) {
            cycles.push({
                tenure_type: 'TRIAL',
                sequence: sequence++,
                total_cycles: intro.cycles,
                frequency: frequency(price.interval),
                pricing_scheme: {
                    fixed_price: amount(Math.round(price.amountCents * (1 - intro.percentOff / 100)), price.currency),
                },
            })
        }

        cycles.push({
            tenure_type: 'REGULAR',
            sequence: sequence,
            // 0 = until cancelled.
            total_cycles: 0,
            frequency: frequency(price.interval),
            pricing_scheme: { fixed_price: amount(price.amountCents, price.currency) },
        })

        const created = await paypal.post<{ id: string }>(
            '/v1/billing/plans',
            {
                product_id: productId,
                name: offer
                    ? `${plan.name} — ${offer.name} (${price.currency}/${price.interval})`
                    : `${plan.name} (${price.currency}/${price.interval})`,
                status: 'ACTIVE',
                billing_cycles: cycles,
                payment_preferences: { auto_bill_outstanding: true },
            },
            // Same insurance as the product: someone is billed on this plan, so a
            // retried sync must get the one already created, never a twin.
            { 'PayPal-Request-Id': `powerlog-plan-${offer ? `${offer.id}-` : ''}${price.id}` },
        )

        return created.id
    }

    async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
        const paypal = this.require()

        // With an offer, the checkout points at the offer's own plan — that is where
        // the trial and the intro cycles are.
        const planId = request.offer
            ? request.offer.paypalPlanFor(request.price.id)
            : request.price.externalIdOn('paypal')
        if (!planId) throw new PriceNotSyncedError()

        const subscription = await this.call('checkout', () =>
            paypal.post<{ id: string; links: { rel: string; href: string }[] }>('/v1/billing/subscriptions', {
                plan_id: planId,
                // PayPal has no `client_reference_id`, and `custom_id` is one string.
                // The user id is what the webhook cannot work out on its own; the plan
                // and price are recovered from the PayPal plan id, which we minted.
                custom_id: request.userId,
                subscriber: { email_address: request.email },
                application_context: {
                    return_url: request.successUrl,
                    cancel_url: request.cancelUrl,
                    user_action: 'SUBSCRIBE_NOW',
                    shipping_preference: 'NO_SHIPPING',
                },
            }),
        )

        const approve = subscription.links.find((link) => link.rel === 'approve')?.href
        if (!approve) throw new GatewayRequestFailedError('paypal', 'subscription has no approval link')

        // PayPal has no embedded form: it is always a redirect to approve.
        return { url: approve, clientSecret: null }
    }

    /**
     * PayPal cancels **now**, not at the end of the period — there is no
     * cancel-at-period-end. The user keeps what they paid for because of our own
     * entitlement rule (a canceled subscription grants its plan until
     * `currentPeriodEnd`), not because PayPal is being kind.
     */
    async cancelAtPeriodEnd(subscription: SubscriptionAggregate): Promise<void> {
        const paypal = this.require()

        await this.call('cancel', () =>
            paypal.post<void>(`/v1/billing/subscriptions/${this.gatewayIdOf(subscription)}/cancel`, {
                reason: 'Cancelled by the subscriber',
            }),
        )
    }

    async resume(): Promise<void> {
        // Nothing to undo: PayPal's cancellation is final. The UI knows (via
        // `supportsResume`) and never offers the button, so reaching here means
        // somebody called the API directly.
        throw new ResumeNotSupportedError('paypal')
    }

    async changePlan(
        subscription: SubscriptionAggregate,
        newPrice: PlanPriceEntity,
        _mode: PlanChangeMode,
    ): Promise<string | null> {
        const paypal = this.require()
        const planId = newPrice.externalIdOn('paypal')
        if (!planId) throw new PriceNotSyncedError()

        const revised = await this.call('change_plan', () =>
            paypal.post<{ links?: { rel: string; href: string }[] }>(
                `/v1/billing/subscriptions/${this.gatewayIdOf(subscription)}/revise`,
                { plan_id: planId },
            ),
        )

        // PayPal prices the change itself and asks the subscriber to approve it, so
        // the proration mode we were given has nothing to act on here — the approval
        // link is what the caller needs.
        return revised.links?.find((link) => link.rel === 'approve')?.href ?? null
    }

    /** PayPal has no embeddable portal: subscribers manage their plan on paypal.com. */
    async billingPortalUrl(): Promise<string | null> {
        return null
    }

    /**
     * PayPal does not sign with a shared secret: it signs with a certificate and
     * expects you to **ask its API** whether the event is genuine. So verification
     * is a network call, and it needs the raw body — the payload is re-hashed on
     * their side, so a re-serialized body fails.
     */
    async verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<GatewayEvent> {
        const paypal = this.require()
        if (!this.webhookId) throw new GatewayNotConfiguredError('paypal')

        const event = JSON.parse(rawBody.toString('utf8')) as PayPalEvent

        const verification = await paypal.post<{ verification_status: string }>(
            '/v1/notifications/verify-webhook-signature',
            {
                auth_algo: headers['paypal-auth-algo'],
                cert_url: headers['paypal-cert-url'],
                transmission_id: headers['paypal-transmission-id'],
                transmission_sig: headers['paypal-transmission-sig'],
                transmission_time: headers['paypal-transmission-time'],
                webhook_id: this.webhookId,
                webhook_event: event,
            },
        )

        if (verification.verification_status !== 'SUCCESS') {
            throw new GatewayRequestFailedError('paypal', 'webhook signature not verified')
        }

        return this.translate(event)
    }

    private translate(event: PayPalEvent): GatewayEvent {
        const base = { gateway: 'paypal' as const, eventId: event.id, type: event.event_type }

        switch (event.event_type) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
            case 'BILLING.SUBSCRIPTION.UPDATED':
            case 'BILLING.SUBSCRIPTION.CANCELLED':
            case 'BILLING.SUBSCRIPTION.SUSPENDED':
            case 'BILLING.SUBSCRIPTION.EXPIRED': {
                const resource = event.resource as PayPalSubscription

                return {
                    ...base,
                    kind: 'subscription_changed',
                    gatewaySubscriptionId: resource.id,
                    // PayPal's ACTIVATED is the FIRST we hear of the subscription — there
                    // is no checkout-completed event — so the user id rides along and the
                    // handler creates the row if it does not exist yet.
                    userId: resource.custom_id ?? null,
                    status: statusOf(resource.status),
                    currentPeriodStart: dateOf(resource.billing_info?.last_payment?.time ?? resource.start_time),
                    // What they have paid for runs until the next charge would have been.
                    currentPeriodEnd: dateOf(resource.billing_info?.next_billing_time ?? resource.start_time),
                    // Cancelling is terminal here, so it always means "won't renew".
                    cancelAtPeriodEnd: resource.status === 'CANCELLED',
                    canceledAt: resource.status === 'CANCELLED' ? dateOf(resource.status_update_time) : null,
                    gatewayPriceId: resource.plan_id ?? null,
                }
            }

            case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
                const resource = event.resource as PayPalSubscription

                // Dunning began. The subscription itself still says ACTIVE — PayPal
                // only moves it to SUSPENDED after giving up — so no status rides
                // along: this is the signal Stripe carries on `invoice.payment_failed`,
                // which PayPal has no invoice to hang on.
                return { ...base, kind: 'payment_failed', gatewaySubscriptionId: resource.id }
            }

            case 'PAYMENT.SALE.COMPLETED': {
                const sale = event.resource as PayPalSale
                const cents = Math.round(Number(sale.amount?.total ?? '0') * 100)

                return {
                    ...base,
                    kind: 'invoice',
                    // PayPal issues no invoice and no PDF: a sale IS the record. It mirrors
                    // as a paid invoice with no `pdfUrl`, and the billing page shows it
                    // exactly like a Stripe one.
                    gatewayInvoiceId: sale.id,
                    gatewaySubscriptionId: sale.billing_agreement_id ?? null,
                    gatewayCustomerId: null,
                    number: null,
                    status: 'paid',
                    amountDueCents: cents,
                    amountPaidCents: cents,
                    currency: this.currencyOf(sale.amount?.currency ?? 'EUR'),
                    hostedUrl: null,
                    pdfUrl: null,
                    issuedAt: dateOf(sale.create_time),
                    paidAt: dateOf(sale.create_time),
                    paymentFailed: false,
                }
            }

            default:
                return { ...base, kind: 'unhandled' }
        }
    }

    /**
     * PayPal cannot list "all my subscriptions": it only lists them **per plan**, so
     * the catalog we published there is the way in. A plan it does not know yet is
     * skipped rather than failing the whole sweep.
     */
    async listLiveSubscriptionIds(planExternalIds: string[]): Promise<string[] | null> {
        const paypal = this.require()
        if (planExternalIds.length === 0) return []

        const ids: string[] = []
        for (const planId of planExternalIds) {
            try {
                // Paged through in full: a plan with more than one page of live
                // subscriptions is exactly the moment truncation would fabricate
                // drift out of everyone past the first page.
                let page = 1
                let totalPages = 1
                do {
                    const result = await paypal.get<{
                        subscriptions?: { id: string; status: string }[]
                        total_pages?: number
                    }>(
                        `/v1/billing/subscriptions?plan_ids=${planId}&statuses=ACTIVE,SUSPENDED` +
                            `&page_size=100&page=${page}&total_required=true`,
                    )
                    for (const subscription of result.subscriptions ?? []) ids.push(subscription.id)

                    totalPages = result.total_pages ?? 1
                    page += 1
                } while (page <= totalPages)
            } catch (error) {
                // One plan failing must not turn the whole reconciliation into a false
                // "everything drifted": say "no signal" instead.
                this.logger.warn({ planId, err: error }, 'paypal could not list subscriptions for a plan')

                return null
            }
        }

        return ids
    }

    private require(): PayPalClient {
        if (!this.client) throw new GatewayNotConfiguredError('paypal')

        return this.client
    }

    private gatewayIdOf(subscription: SubscriptionAggregate): string {
        const id = subscription.gatewaySubscriptionId
        if (!id) throw new GatewayRequestFailedError('paypal', 'subscription is not linked to PayPal')

        return id
    }

    /** We only sell EUR and USD. Anything else is worth a warning, not a silent EUR. */
    private currencyOf(code: string): Currency {
        const upper = code.toUpperCase()
        if (upper !== 'EUR' && upper !== 'USD') {
            this.logger.warn({ currency: upper }, 'unexpected paypal currency — recorded as EUR')
        }

        return upper === 'USD' ? 'USD' : 'EUR'
    }

    private async call<T>(operation: GatewayOperation, run: () => Promise<T>): Promise<T> {
        try {
            return await this.timed(operation, run)
        } catch (error) {
            if (error instanceof GatewayRequestFailedError || error instanceof PriceNotSyncedError) throw error

            this.logger.error({ operation, err: error }, 'paypal request failed')
            throw new GatewayRequestFailedError('paypal', message(error))
        }
    }

    private async timed<T>(operation: GatewayOperation, run: () => Promise<T>): Promise<T> {
        const startedAt = Date.now()
        try {
            const result = await run()
            this.metrics.recordGatewayCall('paypal', operation, 'ok', (Date.now() - startedAt) / 1000)

            return result
        } catch (error) {
            this.metrics.recordGatewayCall('paypal', operation, 'error', (Date.now() - startedAt) / 1000)
            throw error
        }
    }
}

// ── the slice of PayPal's payloads we read ────────────────────────────

interface PayPalEvent {
    id: string
    event_type: string
    resource: unknown
}

interface PayPalSubscription {
    id: string
    status: string
    status_update_time?: string
    custom_id?: string
    plan_id?: string
    start_time?: string
    billing_info?: {
        next_billing_time?: string
        last_payment?: { time?: string }
    }
}

interface PayPalSale {
    id: string
    billing_agreement_id?: string
    create_time?: string
    amount?: { total?: string; currency?: string }
}

/** PayPal's subscription statuses, as ours. */
function statusOf(status: string): SubscriptionStatus {
    switch (status) {
        case 'ACTIVE':
            return 'active'
        case 'APPROVAL_PENDING':
        case 'APPROVED':
            return 'incomplete'
        case 'SUSPENDED':
            // PayPal suspends after failed payments — the same place Stripe's
            // `past_due` is: the money is being chased, the plan is still theirs.
            return 'past_due'
        case 'CANCELLED':
            return 'canceled'
        case 'EXPIRED':
            return 'expired'
        default:
            return 'incomplete'
    }
}

function dateOf(value: string | undefined): Date {
    return value ? new Date(value) : new Date()
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error'
}
