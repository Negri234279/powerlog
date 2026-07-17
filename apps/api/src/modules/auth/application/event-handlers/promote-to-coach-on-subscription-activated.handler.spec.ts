import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryUserRepository } from '../../../../../tests/doubles/auth'
import { RecordingEventBus, silentLogger } from '../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../tests/mothers/auth'
import {
    type SubscriptionChangeReason,
    SubscriptionChangedIntegrationEvent,
} from '../../../../shared/integration-events/subscription-changed.integration-event'
import { UserRoleChangedIntegrationEvent } from '../../../../shared/integration-events/user-role-changed.integration-event'
import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import { PromoteToCoachOnSubscriptionActivated } from './promote-to-coach-on-subscription-activated.handler'

const NOW = new Date('2026-07-15T00:00:00.000Z')
const PERIOD_END = new Date('2026-08-15T00:00:00.000Z')

function setup(seed = [] as ReturnType<UserMother['buildExisting']>[]) {
    const users = new InMemoryUserRepository(seed)
    const events = new RecordingEventBus()
    const handler = new PromoteToCoachOnSubscriptionActivated(users, new FakeClock(NOW), events.asEventBus(), silentLogger())

    return { handler, users, events }
}

const subscriptionChanged = (
    audience: PlanAudience,
    reason: SubscriptionChangeReason,
    userId = 'u-1',
): SubscriptionChangedIntegrationEvent =>
    new SubscriptionChangedIntegrationEvent(userId, 'sub-1', `${audience}-pro`, audience, reason, PERIOD_END)

describe('PromoteToCoachOnSubscriptionActivated', () => {
    it('promotes the athlete to coach when a coach plan activates', async () => {
        const ctx = setup([UserMother.athlete().withId('u-1').buildExisting()])

        await ctx.handler.handle(subscriptionChanged('coach', 'activated'))

        expect((await ctx.users.findById('u-1'))?.role.value).toBe('coach')
    })

    it('announces the new role so the entitlements cache forgets the athlete plan', async () => {
        const ctx = setup([UserMother.athlete().withId('u-1').buildExisting()])

        await ctx.handler.handle(subscriptionChanged('coach', 'activated'))

        expect(ctx.events.published).toContainEqual(new UserRoleChangedIntegrationEvent('u-1', 'coach'))
    })

    it('leaves an athlete alone when the plan that activated is an athlete plan', async () => {
        const ctx = setup([UserMother.athlete().withId('u-1').buildExisting()])

        await ctx.handler.handle(subscriptionChanged('athlete', 'activated'))

        expect((await ctx.users.findById('u-1'))?.role.value).toBe('athlete')
        expect(ctx.events.published).toEqual([])
    })

    it('never promotes on an ending — a lapsing coach is not re-promoted, an athlete is untouched', async () => {
        const ctx = setup([UserMother.athlete().withId('u-1').buildExisting()])

        for (const reason of ['canceled', 'expired', 'payment_failed'] as const) {
            await ctx.handler.handle(subscriptionChanged('coach', reason))
        }

        expect((await ctx.users.findById('u-1'))?.role.value).toBe('athlete')
        expect(ctx.events.published).toEqual([])
    })

    it('is a no-op when they are already a coach — a renewal announces nothing', async () => {
        const ctx = setup([UserMother.coach().withId('u-1').buildExisting()])

        await ctx.handler.handle(subscriptionChanged('coach', 'renewed'))

        expect(ctx.events.published).toEqual([])
    })

    it('does not fail the webhook when the subscriber is gone', async () => {
        const ctx = setup()

        await expect(ctx.handler.handle(subscriptionChanged('coach', 'activated', 'missing'))).resolves.toBeUndefined()
    })
})
