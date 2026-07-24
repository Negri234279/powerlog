import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeGatewayProvider,
    FakePaymentGateway,
    InMemoryPlanOfferRepository,
    InMemoryPlanPriceRepository,
    InMemoryPlanRepository,
    InMemorySubscriptionRepository,
} from '../../../../../tests/doubles/billing'
import { silentLogger } from '../../../../../tests/doubles/shared'
import { PlanMother, SubscriptionMother } from '../../../../../tests/mothers/billing'
import { PlanOfferEntity } from '../../domain/entities/plan-offer.entity'
import { PlanPriceEntity } from '../../domain/entities/plan-price.entity'
import { ReconcileSubscriptions } from './reconcile-subscriptions.service'

const NOW = new Date('2026-07-15T00:00:00.000Z')
const PRO = PlanMother.athletePro()

function aSyncedPrice(): PlanPriceEntity {
    const price = PlanPriceEntity.create({
        id: 'price-eur',
        planId: PRO.id,
        interval: 'month',
        currency: 'EUR',
        amountCents: 799,
        now: NOW,
    })
    price.syncedTo('stripe', 'px_eur', NOW)

    return price
}

const aSubscription = (gatewaySubscriptionId: string) =>
    SubscriptionMother.create({
        id: `local-${gatewaySubscriptionId}`,
        userId: `u-${gatewaySubscriptionId}`,
        planId: PRO.id,
        gateway: 'stripe',
        gatewaySubscriptionId,
        status: 'active',
        currentPeriodStart: NOW,
        currentPeriodEnd: new Date('2026-08-15T00:00:00.000Z'),
    })

/**
 * The comparison that catches the bug nothing else can: a webhook that never
 * arrived. Nothing throws when one is lost — the app just quietly believes the
 * wrong thing — so the only signal is asking the provider and disagreeing.
 */
describe('ReconcileSubscriptions', () => {
    let subscriptions: InMemorySubscriptionRepository
    let plans: InMemoryPlanRepository
    let prices: InMemoryPlanPriceRepository
    let offers: InMemoryPlanOfferRepository
    let gateway: FakePaymentGateway

    beforeEach(() => {
        subscriptions = new InMemorySubscriptionRepository()
        plans = new InMemoryPlanRepository([PlanMother.athletePro()])
        prices = new InMemoryPlanPriceRepository([aSyncedPrice()])
        offers = new InMemoryPlanOfferRepository()
        gateway = new FakePaymentGateway()
    })

    const reconcile = () =>
        new ReconcileSubscriptions(
            subscriptions,
            plans,
            prices,
            offers,
            new FakeGatewayProvider(gateway),
            silentLogger(),
        )

    it('reports no drift when both sides agree', async () => {
        await subscriptions.save(aSubscription('sub_1'))
        gateway.liveAtGateway(['sub_1'])

        const [drift] = await reconcile().run()

        expect(drift).toMatchObject({ gateway: 'stripe', total: 0, missingLocally: [], staleLocally: [] })
    })

    it('catches the subscription the gateway is billing and we never heard about', async () => {
        // The exact shape of a lost `checkout.session.completed`: they are paying, and
        // as far as this app is concerned they are on the free plan.
        gateway.liveAtGateway(['sub_paying_for_nothing'])

        const [drift] = await reconcile().run()

        expect(drift?.missingLocally).toEqual(['sub_paying_for_nothing'])
        expect(drift?.total).toBe(1)
    })

    it('catches the plan we are granting to somebody the gateway stopped billing', async () => {
        // A lost cancellation: we keep giving away a paid plan for free.
        await subscriptions.save(aSubscription('sub_gone'))
        gateway.liveAtGateway([])

        const [drift] = await reconcile().run()

        expect(drift?.staleLocally).toEqual(['sub_gone'])
        expect(drift?.total).toBe(1)
    })

    it('says "no signal" — not "no drift" — when the provider could not be asked', async () => {
        // Reporting a zero here would silence the alert with a number we made up.
        await subscriptions.save(aSubscription('sub_1'))
        gateway.liveAtGateway(null)

        const [drift] = await reconcile().run()

        expect(drift?.total).toBeNull()
    })

    it('ignores a gateway this deployment has no keys for', async () => {
        gateway.unconfigured()

        expect(await reconcile().run()).toEqual([])
    })

    it('leaves the free plan and its non-paying users out of it', async () => {
        // Free users have no subscription row at all, so there is nothing to compare.
        plans.seed(PlanMother.athleteFree())
        gateway.liveAtGateway([])

        const [drift] = await reconcile().run()

        expect(drift?.total).toBe(0)
    })

    it('asks about the offers’ own plans too — their subscribers live there, not on the price', async () => {
        // On PayPal an offer is a billing plan of its own, and a subscriber who
        // signed on it stays there for life — including after the offer is retired.
        // A reconciliation that only asks about the prices' plans cannot see them,
        // and would report every one of them as stale drift.
        const offer = PlanOfferEntity.create({
            id: 'offer-1',
            planId: PRO.id,
            name: 'Launch',
            trialDays: 7,
            startsAt: NOW,
            now: NOW,
        })
        offer.syncedToPaypal({ 'price-eur': 'P-OFFER-EUR' }, NOW)
        offer.deactivate(NOW)
        await offers.save(offer)

        await subscriptions.save(aSubscription('sub_on_offer'))
        gateway.liveAtGatewayOnPlan('P-OFFER-EUR', ['sub_on_offer'])

        const [drift] = await reconcile().run()

        expect(drift?.total).toBe(0)
    })
})
