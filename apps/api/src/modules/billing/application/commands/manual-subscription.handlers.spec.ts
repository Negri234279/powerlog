import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeIdGenerator,
    InMemoryPlanRepository,
    InMemorySubscriptionRepository,
} from '../../../../../tests/doubles/billing'
import { silentLogger } from '../../../../../tests/doubles/shared'
import { PlanMother, SubscriptionMother } from '../../../../../tests/mothers/billing'
import { PlanAggregate } from '../../domain/entities/plan.entity'
import {
    NotAManualSubscriptionError,
    PlanNotAvailableError,
    PlanNotFoundError,
    SubscriptionAlreadyActiveError,
    SubscriptionNotFoundError,
} from '../../domain/errors/billing.errors'
import { AssignSubscriptionCommand } from './assign-subscription/assign-subscription.command'
import { AssignSubscriptionHandler } from './assign-subscription/assign-subscription.handler'
import { RevokeSubscriptionCommand } from './revoke-subscription/revoke-subscription.command'
import { RevokeSubscriptionHandler } from './revoke-subscription/revoke-subscription.handler'

const USER = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-07-15T00:00:00.000Z')

describe('manual subscriptions (admin)', () => {
    let plans: InMemoryPlanRepository
    let subscriptions: InMemorySubscriptionRepository
    let clock: FakeClock
    let ids: FakeIdGenerator

    beforeEach(() => {
        plans = new InMemoryPlanRepository([PlanMother.athleteFree(), PlanMother.athletePro()])
        subscriptions = new InMemorySubscriptionRepository()
        clock = new FakeClock(NOW)
        ids = new FakeIdGenerator(['sub-1'])
    })

    const assign = () => new AssignSubscriptionHandler(subscriptions, plans, clock, ids, silentLogger())
    const revoke = () => new RevokeSubscriptionHandler(subscriptions, clock, silentLogger())

    it('grants a plan with no gateway and nothing charged', async () => {
        const id = await assign().execute(new AssignSubscriptionCommand(USER, 'plan-athlete-pro', null))

        const granted = await subscriptions.findLiveByUser(USER)
        expect(granted?.id).toBe(id)
        expect(granted?.gateway).toBe('manual')
        expect(granted?.planPriceId).toBeNull()
        expect(granted?.isEntitledAt(NOW)).toBe(true)
    })

    it('runs for a year when no end date is given', async () => {
        await assign().execute(new AssignSubscriptionCommand(USER, 'plan-athlete-pro', null))

        const granted = await subscriptions.findLiveByUser(USER)
        // A forgotten comp should not become permanent.
        expect(granted?.currentPeriodEnd).toEqual(new Date('2027-07-15T00:00:00.000Z'))
    })

    it('honours an explicit end date', async () => {
        const until = new Date('2026-08-01T00:00:00.000Z')

        await assign().execute(new AssignSubscriptionCommand(USER, 'plan-athlete-pro', until))

        expect((await subscriptions.findLiveByUser(USER))?.currentPeriodEnd).toEqual(until)
    })

    it('refuses to shadow a subscription the user already has', async () => {
        await subscriptions.save(SubscriptionMother.create({ userId: USER, planId: 'plan-athlete-pro' }))

        await expect(
            assign().execute(new AssignSubscriptionCommand(USER, 'plan-athlete-pro', null)),
        ).rejects.toBeInstanceOf(SubscriptionAlreadyActiveError)
    })

    it('refuses a plan that is not open for signups', async () => {
        const draft = PlanAggregate.create({
            id: 'plan-draft',
            audience: 'athlete',
            slug: 'athlete-draft',
            name: 'Draft',
            status: 'draft',
            entitlements: { templates: true, mesocycles: true, ai: true },
            now: NOW,
        })
        plans.seed(draft)

        await expect(assign().execute(new AssignSubscriptionCommand(USER, draft.id, null))).rejects.toBeInstanceOf(
            PlanNotAvailableError,
        )
    })

    it('refuses a plan that does not exist', async () => {
        await expect(assign().execute(new AssignSubscriptionCommand(USER, 'nope', null))).rejects.toBeInstanceOf(
            PlanNotFoundError,
        )
    })

    it('revoking a grant drops the user back to free right away', async () => {
        const id = await assign().execute(new AssignSubscriptionCommand(USER, 'plan-athlete-pro', null))

        await revoke().execute(new RevokeSubscriptionCommand(id))

        // No live subscription left → the entitlement resolution falls back to free.
        expect(await subscriptions.findLiveByUser(USER)).toBeNull()
    })

    it('refuses to revoke a subscription a gateway is billing', async () => {
        // Killing the local row would leave the card being charged for something the
        // user no longer has. That one is ended at the gateway, and comes back by webhook.
        const stripe = SubscriptionMother.create({ id: 'sub-stripe', userId: USER, gateway: 'stripe' })
        await subscriptions.save(stripe)

        await expect(revoke().execute(new RevokeSubscriptionCommand('sub-stripe'))).rejects.toBeInstanceOf(
            NotAManualSubscriptionError,
        )
        expect((await subscriptions.findLiveByUser(USER))?.status).toBe('active')
    })

    it('fails on a subscription that is not there', async () => {
        await expect(revoke().execute(new RevokeSubscriptionCommand('nope'))).rejects.toBeInstanceOf(
            SubscriptionNotFoundError,
        )
    })
})
