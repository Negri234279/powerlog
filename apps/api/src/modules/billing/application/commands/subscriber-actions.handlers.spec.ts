import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeBillingConfig,
    FakeBillingMetrics,
    FakeClock,
    FakeGatewayProvider,
    FakePaymentGateway,
    InMemoryPlanOfferRepository,
    InMemoryPlanPriceRepository,
    InMemoryPlanRepository,
    InMemorySubscriptionRepository,
} from '../../../../../tests/doubles/billing'
import { FakeUserDirectory, silentLogger } from '../../../../../tests/doubles/shared'
import { PlanMother, SubscriptionMother } from '../../../../../tests/mothers/billing'
import { PlanOfferEntity } from '../../domain/entities/plan-offer.entity'
import { PlanPriceEntity } from '../../domain/entities/plan-price.entity'
import {
    GatewayNotConfiguredError,
    NoActiveSubscriptionError,
    NotAGatewaySubscriptionError,
    OfferNotRedeemableError,
    SamePlanError,
    SubscriptionAlreadyActiveError,
} from '../../domain/errors/billing.errors'
import {
    CancelSubscriptionCommand,
    ChangePlanCommand,
    ResumeSubscriptionCommand,
} from './manage-subscription/manage-subscription.commands'
import {
    CancelSubscriptionHandler,
    ChangePlanHandler,
    ResumeSubscriptionHandler,
} from './manage-subscription/manage-subscription.handlers'
import { StartCheckoutCommand } from './start-checkout/start-checkout.command'
import { StartCheckoutHandler } from './start-checkout/start-checkout.handler'

const NOW = new Date('2026-07-15T00:00:00.000Z')
const USER = 'user-1'
const PRO = PlanMother.athletePro()

function aPrice(id: string, amountCents: number, synced = true): PlanPriceEntity {
    const price = PlanPriceEntity.create({
        id,
        planId: PRO.id,
        interval: 'month',
        currency: 'EUR',
        amountCents,
        now: NOW,
    })
    if (synced) price.syncedToStripe(`px_${id}`, NOW)

    return price
}

describe('what a subscriber can do', () => {
    let subscriptions: InMemorySubscriptionRepository
    let plans: InMemoryPlanRepository
    let prices: InMemoryPlanPriceRepository
    let offers: InMemoryPlanOfferRepository
    let gateway: FakePaymentGateway
    let users: FakeUserDirectory
    let metrics: FakeBillingMetrics
    let clock: FakeClock

    beforeEach(() => {
        subscriptions = new InMemorySubscriptionRepository()
        plans = new InMemoryPlanRepository([PlanMother.athletePro(), PlanMother.athleteFree()])
        prices = new InMemoryPlanPriceRepository([aPrice('price-pro', 799)])
        offers = new InMemoryPlanOfferRepository()
        gateway = new FakePaymentGateway()
        users = new FakeUserDirectory().seed(USER, { email: 'u@example.com', username: 'u' })
        metrics = new FakeBillingMetrics()
        clock = new FakeClock(NOW)
    })

    const provider = () => new FakeGatewayProvider(gateway)
    const checkout = () =>
        new StartCheckoutHandler(
            subscriptions,
            plans,
            prices,
            offers,
            provider(),
            users,
            new FakeBillingConfig(),
            metrics,
            clock,
            silentLogger(),
        )
    const cancel = () => new CancelSubscriptionHandler(subscriptions, provider(), clock, silentLogger())
    const resume = () => new ResumeSubscriptionHandler(subscriptions, provider(), clock, silentLogger())
    const changePlan = () => new ChangePlanHandler(subscriptions, provider(), clock, plans, prices, silentLogger())

    const aLiveSubscription = () =>
        SubscriptionMother.create({
            userId: USER,
            planId: PRO.id,
            planPriceId: 'price-pro',
            gateway: 'stripe',
            gatewaySubscriptionId: 'sub_1',
            currentPeriodStart: NOW,
            currentPeriodEnd: new Date('2026-08-15T00:00:00.000Z'),
        })

    describe('starting a checkout', () => {
        it('returns the URL to pay at — and creates nothing locally', async () => {
            const url = await checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', null))

            expect(url).toBe('https://gateway.test/checkout/price-pro')
            // The subscription is born from the webhook. A user who pays and closes the
            // tab must still end up subscribed; one who fakes the redirect must not.
            expect(subscriptions.all()).toEqual([])
            expect(metrics.checkouts).toEqual([{ plan: 'athlete-pro', status: 'started' }])
        })

        it('refuses when the user already pays for something', async () => {
            await subscriptions.save(aLiveSubscription())

            await expect(
                checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', null)),
            ).rejects.toBeInstanceOf(SubscriptionAlreadyActiveError)
        })

        it('refuses an offer that is over — holding on to its id is not a discount', async () => {
            const expired = PlanOfferEntity.create({
                id: 'offer-old',
                planId: PRO.id,
                name: 'Launch',
                trialDays: 14,
                startsAt: new Date('2026-01-01T00:00:00.000Z'),
                endsAt: new Date('2026-02-01T00:00:00.000Z'),
                now: NOW,
            })
            await offers.save(expired)

            await expect(
                checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', 'offer-old')),
            ).rejects.toBeInstanceOf(OfferNotRedeemableError)
        })

        it('refuses cleanly when this deployment has no keys for the gateway', async () => {
            gateway.unconfigured()

            await expect(
                checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', null)),
            ).rejects.toBeInstanceOf(GatewayNotConfiguredError)
        })
    })

    describe('cancelling and resuming', () => {
        it('asks the gateway to stop the renewal, and changes nothing until it confirms', async () => {
            await subscriptions.save(aLiveSubscription())

            await cancel().execute(new CancelSubscriptionCommand(USER))

            expect(gateway.calls).toEqual([{ operation: 'cancel', subscriptionId: 'sub-1' }])
            // The row flips when the webhook says so — not here.
            expect((await subscriptions.findLiveByUser(USER))?.cancelAtPeriodEnd).toBe(false)
        })

        it('refuses to manage a plan an admin granted — there is no gateway to ask', async () => {
            await subscriptions.save(SubscriptionMother.create({ userId: USER, planId: PRO.id, gateway: 'manual' }))

            await expect(cancel().execute(new CancelSubscriptionCommand(USER))).rejects.toBeInstanceOf(
                NotAGatewaySubscriptionError,
            )
        })

        it('refuses when there is nothing to cancel', async () => {
            await expect(cancel().execute(new CancelSubscriptionCommand(USER))).rejects.toBeInstanceOf(
                NoActiveSubscriptionError,
            )
        })

        it('resumes a subscription that was going to end', async () => {
            await subscriptions.save(aLiveSubscription())

            await resume().execute(new ResumeSubscriptionCommand(USER))

            expect(gateway.calls).toEqual([{ operation: 'resume', subscriptionId: 'sub-1' }])
        })
    })

    describe('changing plan', () => {
        it('charges an upgrade now, pro-rated', async () => {
            await prices.save(aPrice('price-elite', 3999))
            await subscriptions.save(aLiveSubscription())

            await changePlan().execute(new ChangePlanCommand(USER, 'price-elite'))

            expect(gateway.calls).toEqual([
                {
                    operation: 'change_plan',
                    subscriptionId: 'sub-1',
                    priceId: 'price-elite',
                    mode: 'immediate_proration',
                },
            ])
        })

        it('schedules a downgrade for the end of the period they already paid for', async () => {
            await prices.save(aPrice('price-lite', 299))
            await subscriptions.save(aLiveSubscription())

            await changePlan().execute(new ChangePlanCommand(USER, 'price-lite'))

            expect(gateway.calls[0]).toMatchObject({ mode: 'at_period_end' })
            // Remembered locally so the UI can say "you move to X on the 15th" before
            // the renewal webhook makes it real.
            expect((await subscriptions.findLiveByUser(USER))?.pendingPlanPriceId).toBe('price-lite')
        })

        it('refuses to change to the plan they are already on', async () => {
            await subscriptions.save(aLiveSubscription())

            await expect(changePlan().execute(new ChangePlanCommand(USER, 'price-pro'))).rejects.toBeInstanceOf(
                SamePlanError,
            )
        })
    })
})
