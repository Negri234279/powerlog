import type { CommandBus } from '@nestjs/cqrs'
import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeBillingMetrics,
    FakeClock,
    FakeIdGenerator,
    FakeWebhookRetryQueue,
    InMemoryInvoiceRepository,
    InMemoryPlanPriceRepository,
    InMemoryPlanRepository,
    InMemorySubscriptionRepository,
    InMemoryWebhookEventStore,
} from '../../../../../../tests/doubles/billing'
import { RecordingEventBus, silentLogger } from '../../../../../../tests/doubles/shared'
import { PlanMother } from '../../../../../../tests/mothers/billing'
import { PlanPriceEntity } from '../../../domain/entities/plan-price.entity'
import type { CheckoutCompletedEvent, SubscriptionChangedEvent } from '../../ports/gateway-event'
import { HandleGatewayEventCommand } from '../handle-gateway-event/handle-gateway-event.command'
import { HandleGatewayEventHandler } from '../handle-gateway-event/handle-gateway-event.handler'
import { RetryWebhookEventCommand } from './retry-webhook-event.command'
import { RetryWebhookEventHandler } from './retry-webhook-event.handler'

const NOW = new Date('2026-07-15T00:00:00.000Z')
const PERIOD_END = new Date('2026-08-15T00:00:00.000Z')
const PRO = PlanMother.athletePro()

const checkoutFor = (planId: string): CheckoutCompletedEvent => ({
    kind: 'checkout_completed',
    gateway: 'stripe',
    eventId: 'evt_1',
    type: 'checkout.session.completed',
    userId: 'user-1',
    planId,
    planPriceId: 'price-eur',
    offerId: null,
    gatewaySubscriptionId: 'sub_1',
    gatewayCustomerId: 'cus_1',
})

/** The event that opens a Stripe subscription — the one carrying the dates. */
const activationFor = (gatewaySubscriptionId: string): SubscriptionChangedEvent => ({
    kind: 'subscription_changed',
    gateway: 'stripe',
    eventId: 'evt_created_1',
    type: 'customer.subscription.created',
    gatewaySubscriptionId,
    userId: 'user-1',
    gatewayCustomerId: 'cus_1',
    status: 'active',
    currentPeriodStart: NOW,
    currentPeriodEnd: PERIOD_END,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    gatewayPriceId: 'px_eur',
})

function priceOn(stripePriceId: string): PlanPriceEntity {
    const price = PlanPriceEntity.create({
        id: 'price-eur',
        planId: PRO.id,
        interval: 'month',
        currency: 'EUR',
        amountCents: 799,
        now: NOW,
    })
    price.syncedTo('stripe', stripePriceId, NOW)

    return price
}

/**
 * The replay path. It matters because the alternative — a failed event that can
 * only be fixed by hand in the database — is how billing bugs become billing
 * incidents.
 */
describe('replaying a failed webhook', () => {
    let subscriptions: InMemorySubscriptionRepository
    let plans: InMemoryPlanRepository
    let prices: InMemoryPlanPriceRepository
    let events: InMemoryWebhookEventStore
    let pipeline: HandleGatewayEventHandler

    beforeEach(() => {
        subscriptions = new InMemorySubscriptionRepository()
        // The plan is NOT in the catalog yet: that is what makes the first delivery fail.
        plans = new InMemoryPlanRepository()
        prices = new InMemoryPlanPriceRepository()
        events = new InMemoryWebhookEventStore()

        pipeline = new HandleGatewayEventHandler(
            subscriptions,
            plans,
            prices,
            new InMemoryInvoiceRepository(),
            events,
            new FakeWebhookRetryQueue(),
            new FakeBillingMetrics(),
            new FakeClock(NOW),
            new FakeIdGenerator(),
            new RecordingEventBus().asEventBus(),
            silentLogger(),
        )
    })

    /** Dispatches to the real pipeline — the replay must not have its own path. */
    const commandBus = {
        execute: (command: HandleGatewayEventCommand) => pipeline.execute(command),
    } as unknown as CommandBus

    const retry = () => new RetryWebhookEventHandler(events, commandBus, silentLogger())

    it('re-runs the event and succeeds once the cause is fixed', async () => {
        await expect(pipeline.execute(new HandleGatewayEventCommand(checkoutFor(PRO.id)))).rejects.toThrow()
        expect(events.all()[0]?.status).toBe('failed')

        // Fix the cause (the plan is back), then replay from the payload the journal kept.
        plans.seed(PlanMother.athletePro())
        await retry().execute(new RetryWebhookEventCommand(events.all()[0]!.id))

        const created = await subscriptions.findByGatewayId('sub_1')
        expect(created?.userId).toBe('user-1')
        expect(events.all()[0]?.status).toBe('processed')
    })

    it('does not let the dedupe refuse its own replay', async () => {
        // The journal row is what makes a provider's retry a no-op. A human asking for
        // a replay has to get past exactly that — and this is the test that says so.
        plans.seed(PlanMother.athletePro())
        await pipeline.execute(new HandleGatewayEventCommand(checkoutFor(PRO.id)))
        const [record] = events.all()

        await retry().execute(new RetryWebhookEventCommand(record!.id))

        // Re-processed, and still exactly one subscription: the pipeline is idempotent
        // on its own (the subscription already exists, so it is left alone).
        expect(subscriptions.all()).toHaveLength(1)
        expect(events.all()[0]?.status).toBe('processed')
    })

    it('replays an event whose dates the journal turned into strings', async () => {
        // The journal is JSONB: a `Date` goes in and a string comes out. Handing that
        // straight to the pipeline threw `value.toISOString is not a function` — the
        // replay button was broken for exactly the events most worth replaying, the
        // ones that decide whether somebody is subscribed.
        plans.seed(PlanMother.athletePro())
        await prices.save(priceOn('px_eur'))

        await pipeline.execute(new HandleGatewayEventCommand(activationFor('sub_1')))
        const [record] = events.all()
        expect(typeof (record!.payload as { currentPeriodEnd: unknown }).currentPeriodEnd).toBe('string')

        await retry().execute(new RetryWebhookEventCommand(record!.id))

        const replayed = await subscriptions.findByGatewayId('sub_1')
        expect(replayed?.status).toBe('active')
        expect(replayed?.currentPeriodEnd).toEqual(PERIOD_END)
        expect(events.all()[0]?.status).toBe('processed')
    })

    it('fails loudly on an event that is not there', async () => {
        await expect(retry().execute(new RetryWebhookEventCommand('nope'))).rejects.toThrow(/not found/i)
    })
})
