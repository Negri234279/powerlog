import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryPlanRepository,
    InMemorySubscriptionRepository,
} from '../../../../../../tests/doubles/billing'
import { FakeUserDirectory } from '../../../../../../tests/doubles/shared'
import { PlanMother, SubscriptionMother } from '../../../../../../tests/mothers/billing'
import { GetUserEntitlementsQuery } from '../../../../../shared/contracts/get-user-entitlements.query'
import { FreePlanMissingError, PlanNotFoundError } from '../../../domain/errors/billing.errors'
import { GetUserEntitlementsHandler } from './get-user-entitlements.handler'

const USER = 'u-1'
const NOW = new Date('2026-07-15T00:00:00.000Z')
const AFTER_PERIOD = new Date('2026-08-15T00:00:00.000Z')

const CONTACT = { email: 'a@b.com', username: 'ana' }

describe('GetUserEntitlementsHandler', () => {
    let plans: InMemoryPlanRepository
    let subscriptions: InMemorySubscriptionRepository
    let users: FakeUserDirectory
    let clock: FakeClock

    const buildHandler = () => new GetUserEntitlementsHandler(subscriptions, plans, users, clock)
    const execute = () => buildHandler().execute(new GetUserEntitlementsQuery(USER))

    beforeEach(() => {
        plans = new InMemoryPlanRepository([
            PlanMother.athleteFree(),
            PlanMother.athletePro(),
            PlanMother.coachFree(),
            PlanMother.coachPro(),
        ])
        subscriptions = new InMemorySubscriptionRepository()
        users = new FakeUserDirectory().seed(USER, CONTACT)
        clock = new FakeClock(NOW)
    })

    it('falls back to the free athlete plan — and no coach section — for a plain athlete', async () => {
        const snapshot = await execute()

        expect(snapshot.athlete.plan).toBe('athlete-free')
        expect(snapshot.athlete.ai).toBe(false)
        expect(snapshot.athlete.maxTemplates).toBeNull()
        // No coaching at all: the UI reads this as "no coach plan area to render".
        expect(snapshot.coach).toBeNull()
    })

    it('gives a coach with no subscriptions BOTH free plans — coaching does not buy training', async () => {
        users.seedRole(USER, 'coach')

        const snapshot = await execute()

        expect(snapshot.coach?.plan).toBe('coach-free')
        expect(snapshot.coach?.maxAthletes).toBe(3)
        // Their own training resolves independently, to the free ATHLETE plan.
        expect(snapshot.athlete.plan).toBe('athlete-free')
        expect(snapshot.athlete.ai).toBe(false)
    })

    it('reads the plan of an active athlete subscription', async () => {
        await subscriptions.save(SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro' }))

        const snapshot = await execute()

        expect(snapshot.athlete.plan).toBe('athlete-pro')
        expect(snapshot.athlete.ai).toBe(true)
    })

    it('resolves each audience from its own subscription when the user holds both', async () => {
        users.seedRole(USER, 'coach')
        await subscriptions.save(SubscriptionMother.create({ id: 'sub-a', userId: USER, planId: 'plan-athlete-pro' }))
        await subscriptions.save(SubscriptionMother.create({ id: 'sub-c', userId: USER, planId: 'plan-coach-pro' }))

        const snapshot = await execute()

        expect(snapshot.athlete.plan).toBe('athlete-pro')
        expect(snapshot.athlete.ai).toBe(true)
        expect(snapshot.coach?.plan).toBe('coach-pro')
        expect(snapshot.coach?.maxAthletes).toBe(20)
    })

    it('keeps a paying coach on the free ATHLETE plan for their own training', async () => {
        // A coach-pro subscription buys coaching AI, not personal AI.
        users.seedRole(USER, 'coach')
        await subscriptions.save(SubscriptionMother.create({ userId: USER, planId: 'plan-coach-pro' }))

        const snapshot = await execute()

        expect(snapshot.coach?.ai).toBe(true)
        expect(snapshot.athlete.plan).toBe('athlete-free')
        expect(snapshot.athlete.ai).toBe(false)
    })

    it('reads the plan as it is NOW, not as it was when they signed up', async () => {
        // Entitlements are retroactive by design: the admin granting a feature must
        // reach live subscribers immediately. (Prices are the ones frozen per version.)
        await subscriptions.save(SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro' }))
        plans.seed(PlanMother.athletePro({ id: 'plan-athlete-pro' }))

        expect((await execute()).athlete.ai).toBe(true)
    })

    it('keeps a canceled subscription on its plan until the paid period ends', async () => {
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro', status: 'canceled' }),
        )

        expect((await execute()).athlete.plan).toBe('athlete-pro')
    })

    it('drops to free once the canceled period has elapsed', async () => {
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro', status: 'canceled' }),
        )
        clock.set(AFTER_PERIOD)

        const snapshot = await execute()

        expect(snapshot.athlete.plan).toBe('athlete-free')
        expect(snapshot.athlete.ai).toBe(false)
    })

    it('keeps a past_due subscriber on their plan while the gateway retries', async () => {
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro', status: 'past_due' }),
        )

        expect((await execute()).athlete.plan).toBe('athlete-pro')
    })

    it('does not entitle a checkout that was never completed', async () => {
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro', status: 'incomplete' }),
        )

        expect((await execute()).athlete.plan).toBe('athlete-free')
    })

    it('honours a manual grant like any other subscription', async () => {
        // Comps and support grants ride the same path — no special case downstream.
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-coach-pro', gateway: 'manual' }),
        )

        const snapshot = await execute()

        expect(snapshot.coach?.plan).toBe('coach-pro')
        expect(snapshot.coach?.maxAthletes).toBe(20)
    })

    it('lets a live coach subscription open the coach section even without the role', async () => {
        // An athlete-role user manually put on a coach plan gets the coach section:
        // the role only picks the FREE fallback; a subscription always counts.
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-coach-pro', gateway: 'manual' }),
        )

        expect((await execute()).coach?.plan).toBe('coach-pro')
    })

    it('fails loudly when a subscription points at a plan that is gone', async () => {
        await subscriptions.save(SubscriptionMother.create({ userId: USER, planId: 'plan-vanished' }))

        await expect(execute()).rejects.toBeInstanceOf(PlanNotFoundError)
    })

    it('fails loudly when an audience has no active free plan', async () => {
        // A broken catalog, not a user error: nobody could be told what they may do.
        plans = new InMemoryPlanRepository([PlanMother.athletePro()])

        await expect(execute()).rejects.toBeInstanceOf(FreePlanMissingError)
    })
})
