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
    InMemoryTrialRedemptionRepository,
} from '../../../../../tests/doubles/billing'
import { FakeUserDirectory, silentLogger } from '../../../../../tests/doubles/shared'
import { PlanMother, SubscriptionMother } from '../../../../../tests/mothers/billing'
import { PlanOfferEntity } from '../../domain/entities/plan-offer.entity'
import { PlanPriceEntity } from '../../domain/entities/plan-price.entity'
import {
    EmbeddedCheckoutUnsupportedError,
    GatewayNotConfiguredError,
    NoActiveSubscriptionError,
    NotAGatewaySubscriptionError,
    OfferNotRedeemableError,
    ResumeNotSupportedError,
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
const COACH_PRO = PlanMother.coachPro()

function aPrice(id: string, amountCents: number, synced = true, planId = PRO.id): PlanPriceEntity {
    const price = PlanPriceEntity.create({
        id,
        planId,
        interval: 'month',
        currency: 'EUR',
        amountCents,
        now: NOW,
    })
    if (synced) price.syncedTo('stripe', `px_${id}`, NOW)

    return price
}

describe('what a subscriber can do', () => {
    let subscriptions: InMemorySubscriptionRepository
    let plans: InMemoryPlanRepository
    let prices: InMemoryPlanPriceRepository
    let offers: InMemoryPlanOfferRepository
    let trialRedemptions: InMemoryTrialRedemptionRepository
    let gateway: FakePaymentGateway
    let users: FakeUserDirectory
    let metrics: FakeBillingMetrics
    let clock: FakeClock

    beforeEach(() => {
        subscriptions = new InMemorySubscriptionRepository()
        plans = new InMemoryPlanRepository([PlanMother.athletePro(), PlanMother.athleteFree(), PlanMother.coachPro()])
        prices = new InMemoryPlanPriceRepository([
            aPrice('price-pro', 799),
            aPrice('price-coach-pro', 1999, true, COACH_PRO.id),
        ])
        offers = new InMemoryPlanOfferRepository()
        trialRedemptions = new InMemoryTrialRedemptionRepository()
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
            trialRedemptions,
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
            const session = await checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', null))

            expect(session).toEqual({ url: 'https://gateway.test/checkout/price-pro', clientSecret: null })
            // The subscription is born from the webhook. A user who pays and closes the
            // tab must still end up subscribed; one who fakes the redirect must not.
            expect(subscriptions.all()).toEqual([])
            expect(metrics.checkouts).toEqual([{ plan: 'athlete-pro', status: 'started' }])
        })

        it('returns a client secret for an embedded Stripe checkout', async () => {
            const session = await checkout().execute(
                new StartCheckoutCommand(USER, 'price-pro', 'stripe', null, 'embedded'),
            )

            // Embedded is an in-page iframe: no redirect URL, a client secret instead.
            expect(session).toEqual({ url: null, clientSecret: 'cs_test_price-pro' })
            expect(subscriptions.all()).toEqual([])
        })

        it('refuses an embedded checkout on a gateway that has no in-page form', async () => {
            await expect(
                checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'paypal', null, 'embedded')),
            ).rejects.toBeInstanceOf(EmbeddedCheckoutUnsupportedError)
        })

        it('returns an in-app checkout to the plan page by default', async () => {
            await checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', null))

            const call = gateway.calls.find((entry) => entry.operation === 'checkout')
            expect(call?.successUrl).toBe('https://app.test/profile/plan?checkout=success&audience=athlete')
            expect(call?.cancelUrl).toBe('https://app.test/profile/plan?checkout=cancelled')
        })

        it('returns a wizard checkout to the dashboard, not the plan page', async () => {
            await checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', null, 'hosted', 'dashboard'))

            const call = gateway.calls.find((entry) => entry.operation === 'checkout')
            expect(call?.successUrl).toBe('https://app.test/dashboard')
            expect(call?.cancelUrl).toBe('https://app.test/dashboard')
        })

        it('refuses when the user already pays for a plan IN THIS AUDIENCE', async () => {
            await subscriptions.save(aLiveSubscription())

            await expect(
                checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', null)),
            ).rejects.toBeInstanceOf(SubscriptionAlreadyActiveError)
        })

        it('lets a user with a live athlete plan buy a coach plan — a different audience', async () => {
            // Independent subscriptions: the athlete plan does not block a coach one.
            await subscriptions.save(aLiveSubscription())

            const session = await checkout().execute(new StartCheckoutCommand(USER, 'price-coach-pro', 'stripe', null))

            expect(session.url).toBe('https://gateway.test/checkout/price-coach-pro')
        })

        it('lets an athlete buy a coach plan — the coach-onboarding path', async () => {
            // An athlete buying a coach plan is how you become a coach: they pay first,
            // and it is the webhook's activation that promotes them (see
            // PromoteToCoachOnSubscriptionActivated), not this call — so a user who
            // pays and walks away stays an athlete.
            const session = await checkout().execute(new StartCheckoutCommand(USER, 'price-coach-pro', 'stripe', null))

            expect(session.url).toBe('https://gateway.test/checkout/price-coach-pro')
            expect(metrics.checkouts).toEqual([{ plan: 'coach-pro', status: 'started' }])
        })

        it('sells the coach plan to a coach', async () => {
            users.seedRole(USER, 'coach')

            const session = await checkout().execute(new StartCheckoutCommand(USER, 'price-coach-pro', 'stripe', null))

            expect(session.url).toBe('https://gateway.test/checkout/price-coach-pro')
        })

        it('sells an athlete plan to a coach — they train too, and plans are independent', async () => {
            // The old rule refused this as a "mismatch". Now a coach's own training is
            // an athlete plan they hold alongside their coach one, so it must go through.
            users.seedRole(USER, 'coach')

            const session = await checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', null))

            expect(session.url).toBe('https://gateway.test/checkout/price-pro')
            expect(metrics.checkouts).toEqual([{ plan: 'athlete-pro', status: 'started' }])
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

        const anActiveOffer = (planId = PRO.id, id = 'offer-live') =>
            PlanOfferEntity.create({
                id,
                planId,
                name: 'Launch',
                message: '14 días gratis',
                trialDays: 14,
                introPhase: { cycles: 3, percentOff: 50 },
                startsAt: new Date('2026-07-01T00:00:00.000Z'),
                endsAt: null,
                now: NOW,
            })

        it('applies the trial the first time an account checks out on the offer', async () => {
            await offers.save(anActiveOffer())

            await checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', 'offer-live'))

            const call = gateway.calls.find((entry) => entry.operation === 'checkout')
            expect(call?.offerId).toBe('offer-live')
            expect(call?.applyTrial).toBe(true)
        })

        it('drops the trial but keeps the offer once the account has used its trial here', async () => {
            await offers.save(anActiveOffer())
            await trialRedemptions.record(USER, 'athlete', NOW)

            await checkout().execute(new StartCheckoutCommand(USER, 'price-pro', 'stripe', 'offer-live'))

            const call = gateway.calls.find((entry) => entry.operation === 'checkout')
            // The offer still rides the checkout — the discount applies — but the free
            // days do not: one trial per account per audience.
            expect(call?.offerId).toBe('offer-live')
            expect(call?.applyTrial).toBe(false)
        })

        it('counts the trial per audience: an athlete trial does not spend the coach one', async () => {
            await offers.save(anActiveOffer(COACH_PRO.id, 'offer-coach'))
            await trialRedemptions.record(USER, 'athlete', NOW)

            await checkout().execute(new StartCheckoutCommand(USER, 'price-coach-pro', 'stripe', 'offer-coach'))

            const call = gateway.calls.find((entry) => entry.operation === 'checkout')
            expect(call?.applyTrial).toBe(true)
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

            await cancel().execute(new CancelSubscriptionCommand(USER, 'athlete'))

            expect(gateway.calls).toEqual([{ operation: 'cancel', subscriptionId: 'sub-1' }])
            // The row flips when the webhook says so — not here.
            expect((await subscriptions.findLiveByUser(USER))?.cancelAtPeriodEnd).toBe(false)
        })

        it('refuses to manage a plan an admin granted — there is no gateway to ask', async () => {
            await subscriptions.save(SubscriptionMother.create({ userId: USER, planId: PRO.id, gateway: 'manual' }))

            await expect(cancel().execute(new CancelSubscriptionCommand(USER, 'athlete'))).rejects.toBeInstanceOf(
                NotAGatewaySubscriptionError,
            )
        })

        it('refuses when there is nothing to cancel', async () => {
            await expect(cancel().execute(new CancelSubscriptionCommand(USER, 'athlete'))).rejects.toBeInstanceOf(
                NoActiveSubscriptionError,
            )
        })

        it('refuses to resume on a provider whose cancellation is terminal (PayPal)', async () => {
            gateway.withoutResume()
            await subscriptions.save(aLiveSubscription())

            await expect(resume().execute(new ResumeSubscriptionCommand(USER, 'athlete'))).rejects.toBeInstanceOf(
                ResumeNotSupportedError,
            )
            // And it never even asked the provider.
            expect(gateway.calls).toEqual([])
        })

        it('resumes a subscription that was going to end', async () => {
            await subscriptions.save(aLiveSubscription())

            await resume().execute(new ResumeSubscriptionCommand(USER, 'athlete'))

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

        it('hands back the approval URL when the provider needs the user to say yes again', async () => {
            // PayPal's `revise` cannot just apply the change: the subscriber has to
            // approve it. The caller sends the browser there; the change lands by webhook.
            gateway.needsApprovalToChangePlan()
            await prices.save(aPrice('price-elite', 3999))
            await subscriptions.save(aLiveSubscription())

            const url = await changePlan().execute(new ChangePlanCommand(USER, 'price-elite'))

            expect(url).toBe('https://gateway.test/approve')
        })

        it('returns nothing when the provider applied it on its own (Stripe)', async () => {
            await prices.save(aPrice('price-elite', 3999))
            await subscriptions.save(aLiveSubscription())

            expect(await changePlan().execute(new ChangePlanCommand(USER, 'price-elite'))).toBeNull()
        })

        it('refuses to change to the plan they are already on', async () => {
            await subscriptions.save(aLiveSubscription())

            await expect(changePlan().execute(new ChangePlanCommand(USER, 'price-pro'))).rejects.toBeInstanceOf(
                SamePlanError,
            )
        })
    })
})
