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

    it('falls back to the free athlete plan when the user has no subscription', async () => {
        const snapshot = await execute()

        expect(snapshot.plan).toBe('athlete-free')
        expect(snapshot.ai).toBe(false)
        expect(snapshot.templates).toBe(true)
    })

    it('falls back to the free COACH plan for a coach — which also covers their own training', async () => {
        users.seedRole(USER, 'coach')

        const snapshot = await execute()

        expect(snapshot.plan).toBe('coach-free')
        expect(snapshot.audience).toBe('coach')
        expect(snapshot.maxAthletes).toBe(3)
        // The coach's own athlete features come from the plan's nested section.
        expect(snapshot.templates).toBe(true)
        expect(snapshot.mesocycles).toBe(true)
    })

    it('reads the plan of an active subscription', async () => {
        await subscriptions.save(SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro' }))

        const snapshot = await execute()

        expect(snapshot.plan).toBe('athlete-pro')
        expect(snapshot.ai).toBe(true)
    })

    it('reads the plan as it is NOW, not as it was when they signed up', async () => {
        // Entitlements are retroactive by design: the admin granting a feature must
        // reach live subscribers immediately. (Prices are the ones frozen per version.)
        await subscriptions.save(SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro' }))
        plans.seed(PlanMother.athletePro({ id: 'plan-athlete-pro' }))

        expect((await execute()).ai).toBe(true)
    })

    it('keeps a canceled subscription on its plan until the paid period ends', async () => {
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro', status: 'canceled' }),
        )

        expect((await execute()).plan).toBe('athlete-pro')
    })

    it('drops to free once the canceled period has elapsed', async () => {
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro', status: 'canceled' }),
        )
        clock.set(AFTER_PERIOD)

        const snapshot = await execute()

        expect(snapshot.plan).toBe('athlete-free')
        expect(snapshot.ai).toBe(false)
    })

    it('keeps a past_due subscriber on their plan while the gateway retries', async () => {
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro', status: 'past_due' }),
        )

        expect((await execute()).plan).toBe('athlete-pro')
    })

    it('does not entitle a checkout that was never completed', async () => {
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro', status: 'incomplete' }),
        )

        expect((await execute()).plan).toBe('athlete-free')
    })

    it('honours a manual grant like any other subscription', async () => {
        // Comps and support grants ride the same path — no special case downstream.
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-coach-pro', gateway: 'manual' }),
        )

        const snapshot = await execute()

        expect(snapshot.plan).toBe('coach-pro')
        expect(snapshot.maxAthletes).toBe(20)
    })

    it('lets the subscribed plan win over the role, not the other way round', async () => {
        // An athlete-role user manually put on a coach plan gets the coach plan: the
        // role only picks the FREE fallback.
        await subscriptions.save(
            SubscriptionMother.create({ userId: USER, planId: 'plan-coach-pro', gateway: 'manual' }),
        )

        expect((await execute()).audience).toBe('coach')
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
