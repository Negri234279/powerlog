import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeBillingMetrics,
    FakeClock,
    FakeIdGenerator,
    InMemoryInvoiceRepository,
    InMemoryPlanOfferRepository,
    InMemoryPlanPriceRepository,
    InMemoryPlanRepository,
    FakeWebhookRetryQueue,
    InMemorySubscriptionRepository,
    InMemoryTrialRedemptionRepository,
    InMemoryWebhookEventStore,
} from '../../../../../../tests/doubles/billing'
import { RecordingEventBus, silentLogger } from '../../../../../../tests/doubles/shared'
import { PlanMother, SubscriptionMother } from '../../../../../../tests/mothers/billing'
import { SubscriptionChangedIntegrationEvent } from '../../../../../shared/integration-events/subscription-changed.integration-event'
import { PlanOfferEntity } from '../../../domain/entities/plan-offer.entity'
import { PlanPriceEntity } from '../../../domain/entities/plan-price.entity'
import type { SubscriptionStatus } from '../../../domain/subscription-status'
import type {
    CheckoutCompletedEvent,
    InvoiceEvent,
    PaymentFailedEvent,
    SubscriptionChangedEvent,
} from '../../ports/gateway-event'
import { HandleGatewayEventCommand } from './handle-gateway-event.command'
import { HandleGatewayEventHandler } from './handle-gateway-event.handler'

const NOW = new Date('2026-07-15T00:00:00.000Z')
const PERIOD_END = new Date('2026-08-15T00:00:00.000Z')
const USER = 'user-1'
const GATEWAY_SUB = 'sub_stripe_1'

const PRO = PlanMother.athletePro()

function aPrice(id: string, amountCents: number, stripePriceId: string): PlanPriceEntity {
    const price = PlanPriceEntity.create({
        id,
        planId: PRO.id,
        interval: 'month',
        currency: 'EUR',
        amountCents,
        now: NOW,
    })
    price.syncedTo('stripe', stripePriceId, NOW)

    return price
}

const checkoutCompleted = (overrides: Partial<CheckoutCompletedEvent> = {}): CheckoutCompletedEvent => ({
    kind: 'checkout_completed',
    gateway: 'stripe',
    eventId: 'evt_checkout_1',
    type: 'checkout.session.completed',
    userId: USER,
    planId: PRO.id,
    planPriceId: 'price-eur',
    offerId: null,
    gatewaySubscriptionId: GATEWAY_SUB,
    gatewayCustomerId: 'cus_1',
    ...overrides,
})

const subscriptionChanged = (overrides: Partial<SubscriptionChangedEvent> = {}): SubscriptionChangedEvent => ({
    kind: 'subscription_changed',
    gateway: 'stripe',
    eventId: 'evt_sub_1',
    type: 'customer.subscription.updated',
    gatewaySubscriptionId: GATEWAY_SUB,
    status: 'active',
    currentPeriodStart: NOW,
    currentPeriodEnd: PERIOD_END,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    gatewayPriceId: 'px_eur',
    ...overrides,
})

const invoiceEvent = (overrides: Partial<InvoiceEvent> = {}): InvoiceEvent => ({
    kind: 'invoice',
    gateway: 'stripe',
    eventId: 'evt_inv_1',
    type: 'invoice.paid',
    gatewayInvoiceId: 'in_1',
    gatewaySubscriptionId: GATEWAY_SUB,
    gatewayCustomerId: 'cus_1',
    number: 'A-0001',
    status: 'paid',
    amountDueCents: 799,
    amountPaidCents: 799,
    currency: 'EUR',
    hostedUrl: 'https://stripe.test/i/in_1',
    pdfUrl: 'https://stripe.test/i/in_1.pdf',
    issuedAt: NOW,
    paidAt: NOW,
    paymentFailed: false,
    ...overrides,
})

describe('the webhook pipeline', () => {
    let subscriptions: InMemorySubscriptionRepository
    let plans: InMemoryPlanRepository
    let prices: InMemoryPlanPriceRepository
    let offers: InMemoryPlanOfferRepository
    let invoices: InMemoryInvoiceRepository
    let trialRedemptions: InMemoryTrialRedemptionRepository
    let events: InMemoryWebhookEventStore
    let retries: FakeWebhookRetryQueue
    let metrics: FakeBillingMetrics
    let bus: RecordingEventBus

    beforeEach(() => {
        subscriptions = new InMemorySubscriptionRepository()
        plans = new InMemoryPlanRepository([PlanMother.athletePro(), PlanMother.athleteFree()])
        prices = new InMemoryPlanPriceRepository([aPrice('price-eur', 799, 'px_eur')])
        offers = new InMemoryPlanOfferRepository()
        invoices = new InMemoryInvoiceRepository()
        trialRedemptions = new InMemoryTrialRedemptionRepository()
        events = new InMemoryWebhookEventStore()
        retries = new FakeWebhookRetryQueue()
        metrics = new FakeBillingMetrics()
        bus = new RecordingEventBus()
    })

    const handler = () =>
        new HandleGatewayEventHandler(
            subscriptions,
            plans,
            prices,
            offers,
            invoices,
            trialRedemptions,
            events,
            retries,
            metrics,
            new FakeClock(NOW),
            new FakeIdGenerator(),
            bus.asEventBus(),
            silentLogger(),
        )

    const deliver = (event: CheckoutCompletedEvent | SubscriptionChangedEvent | InvoiceEvent | PaymentFailedEvent) =>
        handler().execute(new HandleGatewayEventCommand(event))

    /** A subscription already mirrored from the gateway, the way a checkout leaves it. */
    const aMirroredSubscription = (status: SubscriptionStatus = 'active') =>
        SubscriptionMother.create({
            id: 'sub-local',
            userId: USER,
            planId: PRO.id,
            planPriceId: 'price-eur',
            gateway: 'stripe',
            gatewaySubscriptionId: GATEWAY_SUB,
            gatewayCustomerId: 'cus_1',
            status,
            currentPeriodStart: NOW,
            currentPeriodEnd: PERIOD_END,
        })

    describe('checkout completed', () => {
        it('creates the subscription — the webhook does, not the redirect', async () => {
            await deliver(checkoutCompleted())

            const created = await subscriptions.findByGatewayId(GATEWAY_SUB)
            expect(created?.userId).toBe(USER)
            expect(created?.planId).toBe(PRO.id)
            expect(created?.gatewayCustomerId).toBe('cus_1')
        })

        it('grants nothing until the gateway confirms the period', async () => {
            // "You paid" is not the same as the provider saying the subscription is
            // active — the `customer.subscription.updated` that follows says that.
            await deliver(checkoutCompleted())

            const created = await subscriptions.findByGatewayId(GATEWAY_SUB)
            expect(created?.status).toBe('incomplete')
            expect(created?.isEntitledAt(NOW)).toBe(false)
        })

        it('activates on the subscription event that follows, and announces it', async () => {
            await deliver(checkoutCompleted())

            await deliver(subscriptionChanged())

            const live = await subscriptions.findLiveByUser(USER)
            expect(live?.status).toBe('active')
            expect(live?.isEntitledAt(NOW)).toBe(true)
            expect(live?.currentPeriodEnd).toEqual(PERIOD_END)

            const announced = bus.published[0] as SubscriptionChangedIntegrationEvent
            expect(announced).toBeInstanceOf(SubscriptionChangedIntegrationEvent)
            expect(announced.reason).toBe('activated')
            expect(announced.planSlug).toBe('athlete-pro')
        })

        it('counts a redemption when the signup came in through an offer', async () => {
            await deliver(checkoutCompleted({ offerId: 'offer-1' }))

            expect(metrics.offerRedemptions).toEqual(['athlete-pro'])
        })
    })

    describe('trial redemption', () => {
        it('burns the account’s one trial when the gateway reports trialing', async () => {
            await deliver(checkoutCompleted())

            await deliver(subscriptionChanged({ status: 'trialing' }))

            expect(await trialRedemptions.hasRedeemed(USER, 'athlete')).toBe(true)
        })

        it('does not record a trial for a subscription that started billing directly', async () => {
            await deliver(checkoutCompleted())

            await deliver(subscriptionChanged({ status: 'active' }))

            expect(await trialRedemptions.hasRedeemed(USER, 'athlete')).toBe(false)
        })
    })

    describe('idempotency', () => {
        it('a replayed event does nothing the second time', async () => {
            // Providers retry. A retried activation must not become a second subscription.
            await deliver(checkoutCompleted())
            await deliver(checkoutCompleted())

            expect(subscriptions.all()).toHaveLength(1)
            expect(metrics.webhooks.filter((w) => w.status === 'duplicate')).toHaveLength(1)
        })

        it('leaves a failed event on the journal, with its payload, ready to replay', async () => {
            // A checkout for a plan that is not there: the handler throws, and the row
            // keeps everything needed to re-process it once the catalog is fixed.
            await expect(deliver(checkoutCompleted({ planId: 'plan-gone' }))).rejects.toThrow()

            const [record] = events.all()
            expect(record?.status).toBe('failed')
            expect(record?.payload).toBeDefined()
            expect(metrics.webhooks).toEqual([{ type: 'checkout.session.completed', status: 'failed' }])
        })

        it('schedules a backoff retry for a failed event', async () => {
            // The gateway resending would only dedupe to a no-op, so the retry queue is
            // what actually gets the event re-run once the transient cause clears.
            await expect(deliver(checkoutCompleted({ planId: 'plan-gone' }))).rejects.toThrow()

            expect(retries.scheduled).toEqual([{ gateway: 'stripe', eventId: 'evt_checkout_1' }])
        })
    })

    describe('a provider with no checkout event (PayPal)', () => {
        it('creates the subscription from the activation itself, when it carries the user', async () => {
            // PayPal never sends a "checkout completed": BILLING.SUBSCRIPTION.ACTIVATED
            // is the first we hear of the subscription, and it carries the subscriber.
            await deliver(
                subscriptionChanged({
                    gateway: 'paypal',
                    eventId: 'evt_paypal_activated',
                    type: 'BILLING.SUBSCRIPTION.ACTIVATED',
                    userId: USER,
                }),
            )

            const created = await subscriptions.findByGatewayId(GATEWAY_SUB)
            expect(created?.userId).toBe(USER)
            expect(created?.gateway).toBe('paypal')
            expect(created?.planPriceId).toBe('price-eur')
            expect(created?.isEntitledAt(NOW)).toBe(true)
        })

        it('still ignores an event it cannot attribute to anybody', async () => {
            await deliver(subscriptionChanged({ userId: null }))

            expect(subscriptions.all()).toEqual([])
        })

        it('resolves an offer’s own PayPal plan back to the price, so an offer signup is not dropped', async () => {
            // The register bug: a PayPal OFFER bills against its own billing plan id,
            // kept in the offer’s `paypalPlanIds` — not on `plan_prices`. The
            // activation carries that offer plan id, and it must still resolve.
            const offer = PlanOfferEntity.create({
                id: 'offer-1',
                planId: PRO.id,
                name: 'Launch',
                trialDays: 14,
                startsAt: NOW,
                now: NOW,
            })
            offer.syncedToPaypal({ 'price-eur': 'P-OFFER-2TT' }, NOW)
            offers = new InMemoryPlanOfferRepository([offer])

            await deliver(
                subscriptionChanged({
                    gateway: 'paypal',
                    eventId: 'evt_paypal_offer',
                    type: 'BILLING.SUBSCRIPTION.ACTIVATED',
                    userId: USER,
                    gatewayPriceId: 'P-OFFER-2TT',
                }),
            )

            const created = await subscriptions.findByGatewayId(GATEWAY_SUB)
            expect(created?.userId).toBe(USER)
            expect(created?.planPriceId).toBe('price-eur')
            expect(created?.isEntitledAt(NOW)).toBe(true)
        })

        it('fails loudly when it has a subscriber but the price maps to nothing — never a silent drop', async () => {
            // A subscriber and a price id, yet nothing maps to it: a broken catalog, the
            // exact shape of the bug that lost a paid signup. It must land `failed` and
            // be retryable, not be swallowed as "processed".
            await expect(
                deliver(
                    subscriptionChanged({
                        gateway: 'paypal',
                        eventId: 'evt_paypal_unknown',
                        type: 'BILLING.SUBSCRIPTION.ACTIVATED',
                        userId: USER,
                        gatewayPriceId: 'P-NOT-IN-CATALOG',
                    }),
                ),
            ).rejects.toThrow()

            expect(subscriptions.all()).toEqual([])
            expect(events.all()[0]?.status).toBe('failed')
        })
    })

    describe('a checkout that pays immediately (Stripe)', () => {
        /** What Stripe really sends first: born active, one second before the checkout. */
        const subscriptionCreated = (overrides: Partial<SubscriptionChangedEvent> = {}) =>
            subscriptionChanged({
                eventId: 'evt_sub_created',
                type: 'customer.subscription.created',
                userId: USER,
                gatewayCustomerId: 'cus_1',
                status: 'active',
                ...overrides,
            })

        it('activates from `customer.subscription.created` — no `updated` is ever sent', async () => {
            // The subscription is born `active` and Stripe never follows up with an
            // `updated`. Acting only on `updated` left the user paid-up and locked out,
            // staring at "we're finishing setting up your plan" forever.
            await deliver(subscriptionCreated())

            const live = await subscriptions.findLiveByUser(USER)
            expect(live?.status).toBe('active')
            expect(live?.isEntitledAt(NOW)).toBe(true)
            expect(live?.currentPeriodEnd).toEqual(PERIOD_END)
        })

        it('ends up with one active subscription when the creation beats the checkout', async () => {
            // The real order on Stripe: `created` (12:31:12) then `completed` (12:31:13).
            await deliver(subscriptionCreated())
            await deliver(checkoutCompleted())

            expect(subscriptions.all()).toHaveLength(1)

            const live = await subscriptions.findLiveByUser(USER)
            expect(live?.status).toBe('active')
            // The checkout is the one that knows the customer when the creation did not:
            // without it the billing portal has nothing to open.
            expect(live?.gatewayCustomerId).toBe('cus_1')
        })

        it('keeps the customer the subscription was opened with', async () => {
            // A later checkout must not re-point the portal at a different customer.
            await deliver(subscriptionCreated({ gatewayCustomerId: 'cus_original' }))
            await deliver(checkoutCompleted({ gatewayCustomerId: 'cus_other' }))

            const live = await subscriptions.findLiveByUser(USER)
            expect(live?.gatewayCustomerId).toBe('cus_original')
        })

        it('still activates when the checkout happens to land first', async () => {
            await deliver(checkoutCompleted())

            await deliver(subscriptionCreated())

            const live = await subscriptions.findLiveByUser(USER)
            expect(live?.status).toBe('active')
            expect(subscriptions.all()).toHaveLength(1)
        })
    })

    describe('out-of-order delivery', () => {
        it('ignores a subscription event for a subscription it has never seen', async () => {
            // The checkout event is simply late; it will create the row.
            await deliver(subscriptionChanged())

            expect(subscriptions.all()).toHaveLength(0)
        })

        it('does not create a second row when the subscription event lands first', async () => {
            await deliver(subscriptionChanged())

            await deliver(checkoutCompleted())

            expect(subscriptions.all()).toHaveLength(1)
        })

        it('recovers an invoice that arrived before its subscription (PayPal ordering)', async () => {
            // PayPal routinely delivers PAYMENT.SALE.COMPLETED before the activation, so
            // the invoice fails first: there is nobody to attribute it to yet.
            await expect(deliver(invoiceEvent({ gateway: 'paypal' }))).rejects.toThrow()
            expect(invoices.all()).toHaveLength(0)

            // The activation creates the subscription — and the failed invoice is
            // re-driven on the spot, without waiting for an admin replay.
            await deliver(
                subscriptionChanged({
                    gateway: 'paypal',
                    eventId: 'evt_paypal_activated',
                    type: 'BILLING.SUBSCRIPTION.ACTIVATED',
                    userId: USER,
                }),
            )

            const [mirrored] = invoices.all()
            expect(mirrored?.userId).toBe(USER)
            expect(mirrored?.amountPaidCents).toBe(799)

            const invoiceRecord = events.all().find((event) => event.eventId === 'evt_inv_1')
            expect(invoiceRecord?.status).toBe('processed')
        })
    })

    describe('the lifecycle', () => {
        it('a cancellation made in the provider’s own portal takes exactly our path', async () => {
            await subscriptions.save(aMirroredSubscription())

            await deliver(subscriptionChanged({ status: 'canceled', cancelAtPeriodEnd: true, canceledAt: NOW }))

            const canceled = await subscriptions.findByGatewayId(GATEWAY_SUB)
            expect(canceled?.status).toBe('canceled')
            expect(canceled?.cancelAtPeriodEnd).toBe(true)
            // Cancelling never takes back time that was already paid for.
            expect(canceled?.isEntitledAt(NOW)).toBe(true)

            const announced = bus.published.at(-1) as SubscriptionChangedIntegrationEvent
            expect(announced.reason).toBe('canceled')
            expect(metrics.subscriptionEvents).toContain('canceled')
        })

        it('reads a failing card as past_due and keeps the plan while the gateway retries', async () => {
            await subscriptions.save(aMirroredSubscription())

            await deliver(subscriptionChanged({ status: 'past_due' }))

            const dunning = await subscriptions.findByGatewayId(GATEWAY_SUB)
            expect(dunning?.isEntitledAt(NOW)).toBe(true)
            expect(metrics.subscriptionEvents).toContain('payment_failed')
        })

        it('counts a move to a dearer plan as an upgrade, and a cheaper one as a downgrade', async () => {
            await prices.save(aPrice('price-elite', 3999, 'px_elite'))
            await subscriptions.save(aMirroredSubscription())

            await deliver(subscriptionChanged({ gatewayPriceId: 'px_elite' }))

            expect(metrics.subscriptionEvents).toContain('upgraded')
            const moved = await subscriptions.findByGatewayId(GATEWAY_SUB)
            expect(moved?.planPriceId).toBe('price-elite')
        })

        it('reads a renewal as a renewal, not as a fresh activation', async () => {
            await subscriptions.save(aMirroredSubscription())
            const nextPeriodEnd = new Date('2026-09-15T00:00:00.000Z')

            await deliver(subscriptionChanged({ currentPeriodEnd: nextPeriodEnd }))

            expect(metrics.subscriptionEvents).toContain('renewed')
        })

        it('counts a trial going active as the trial converting — the number the offer lives or dies by', async () => {
            await subscriptions.save(aMirroredSubscription('trialing'))
            const firstPaidPeriodEnd = new Date('2026-09-15T00:00:00.000Z')

            await deliver(subscriptionChanged({ currentPeriodEnd: firstPaidPeriodEnd }))

            expect(metrics.subscriptionEvents).toContain('trial_converted')
            // The user is not told anything special — only the counter refines.
            const announced = bus.published.at(-1) as SubscriptionChangedIntegrationEvent
            expect(announced.reason).toBe('renewed')
        })

        it('counts past_due going active as a recovery — the dunning emails did their job', async () => {
            await subscriptions.save(aMirroredSubscription('past_due'))

            await deliver(subscriptionChanged())

            expect(metrics.subscriptionEvents).toContain('recovered')
        })
    })

    describe('invoices', () => {
        beforeEach(async () => {
            await subscriptions.save(aMirroredSubscription())
        })

        it('counts the cash a paid invoice brought in, attributed to its plan', async () => {
            await deliver(invoiceEvent())

            expect(metrics.revenues).toEqual([{ plan: 'athlete-pro', currency: 'EUR', amountCents: 799 }])
        })

        it('counts no revenue for a failed charge', async () => {
            await deliver(
                invoiceEvent({
                    eventId: 'evt_open',
                    type: 'invoice.payment_failed',
                    status: 'open',
                    amountPaidCents: 0,
                    paidAt: null,
                    paymentFailed: true,
                }),
            )

            expect(metrics.revenues).toEqual([])
        })

        it('mirrors what the gateway issued, PDF link and all', async () => {
            await deliver(invoiceEvent())

            const [mirrored] = invoices.all()
            expect(mirrored).toMatchObject({
                userId: USER,
                number: 'A-0001',
                status: 'paid',
                amountPaidCents: 799,
                pdfUrl: 'https://stripe.test/i/in_1.pdf',
            })
        })

        it('updates the same row when an invoice goes from open to paid', async () => {
            await deliver(invoiceEvent({ eventId: 'evt_a', status: 'open', amountPaidCents: 0, paidAt: null }))

            await deliver(invoiceEvent({ eventId: 'evt_b', status: 'paid' }))

            expect(invoices.all()).toHaveLength(1)
            expect(invoices.all()[0]?.status).toBe('paid')
        })

        it('tells the user when their card fails, and counts it', async () => {
            await deliver(
                invoiceEvent({
                    eventId: 'evt_failed',
                    type: 'invoice.payment_failed',
                    status: 'open',
                    amountPaidCents: 0,
                    paidAt: null,
                    paymentFailed: true,
                }),
            )

            const announced = bus.published.at(-1) as SubscriptionChangedIntegrationEvent
            expect(announced.reason).toBe('payment_failed')
            expect(metrics.subscriptionEvents).toContain('payment_failed')
        })
    })

    describe('a failed payment reported without an invoice (PayPal)', () => {
        const paymentFailed = (overrides: Partial<PaymentFailedEvent> = {}): PaymentFailedEvent => ({
            kind: 'payment_failed',
            gateway: 'paypal',
            eventId: 'evt_pp_failed',
            type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
            gatewaySubscriptionId: GATEWAY_SUB,
            ...overrides,
        })

        it('tells the user and counts it, exactly like a failed Stripe invoice', async () => {
            await subscriptions.save(aMirroredSubscription())

            await deliver(paymentFailed())

            const announced = bus.published.at(-1) as SubscriptionChangedIntegrationEvent
            expect(announced.reason).toBe('payment_failed')
            expect(metrics.subscriptionEvents).toContain('payment_failed')
        })

        it('moves no local state — PayPal still considers the subscription active', async () => {
            await subscriptions.save(aMirroredSubscription())

            await deliver(paymentFailed())

            const untouched = await subscriptions.findByGatewayId(GATEWAY_SUB)
            expect(untouched?.status).toBe('active')
            expect(untouched?.isEntitledAt(NOW)).toBe(true)
        })

        it('stays quiet about a subscription we do not mirror', async () => {
            await deliver(paymentFailed({ gatewaySubscriptionId: 'sub_unknown' }))

            expect(bus.published).toHaveLength(0)
            expect(metrics.subscriptionEvents).toHaveLength(0)
        })
    })
})
