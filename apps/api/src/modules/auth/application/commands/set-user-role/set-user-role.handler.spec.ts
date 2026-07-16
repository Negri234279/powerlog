import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryUserRepository } from '../../../../../../tests/doubles/auth'
import { FakeEntitlements, FakeProfiles, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { UserRoleChangedIntegrationEvent } from '../../../../../shared/integration-events/user-role-changed.integration-event'
import { UserNotFoundError } from '../../../domain/errors/auth.errors'
import { SetUserRoleCommand } from './set-user-role.command'
import { SetUserRoleHandler } from './set-user-role.handler'

function setup(users: InMemoryUserRepository) {
    const events = new RecordingEventBus()
    const handler = new SetUserRoleHandler(
        users,
        new FakeClock(),
        new FakeProfiles().set('u1', { username: 'u1', avatarUrl: null, locale: null }),
        new FakeEntitlements().on({ plan: 'coach-free' }),
        events.asEventBus(),
    )

    return { handler, events }
}

describe('SetUserRoleHandler', () => {
    it('changes a user’s role and persists it', async () => {
        const user = UserMother.athlete().withId('u1').withEmail('u1@example.com').buildExisting()
        const repo = new InMemoryUserRepository([user])
        const { handler } = setup(repo)

        const view = await handler.execute(new SetUserRoleCommand('u1', 'coach'))

        expect(view).toMatchObject({ id: 'u1', role: 'coach', username: 'u1', plan: 'coach-free' })
        expect((await repo.findById('u1'))?.role.value).toBe('coach')
    })

    it('announces the new role so the entitlements cache can forget the old one', async () => {
        const user = UserMother.athlete().withId('u1').withEmail('u1@example.com').buildExisting()
        const { handler, events } = setup(new InMemoryUserRepository([user]))

        await handler.execute(new SetUserRoleCommand('u1', 'coach'))

        // Without a subscription the role IS the plan, so a stale cached answer
        // would leave a brand-new coach on the athlete plan.
        expect(events.published).toContainEqual(new UserRoleChangedIntegrationEvent('u1', 'coach'))
    })

    it('announces nothing when the role is already the one asked for', async () => {
        const user = UserMother.coach().withId('u1').withEmail('u1@example.com').buildExisting()
        const { handler, events } = setup(new InMemoryUserRepository([user]))

        await handler.execute(new SetUserRoleCommand('u1', 'coach'))

        expect(events.published).toEqual([])
    })

    it('rejects an unknown user, announcing nothing', async () => {
        const { handler, events } = setup(new InMemoryUserRepository())

        await expect(handler.execute(new SetUserRoleCommand('ghost', 'coach'))).rejects.toBeInstanceOf(
            UserNotFoundError,
        )
        expect(events.published).toEqual([])
    })
})
