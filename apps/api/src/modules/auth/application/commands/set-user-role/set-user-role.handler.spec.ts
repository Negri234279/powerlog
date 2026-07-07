import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryUserRepository } from '../../../../../../tests/doubles/auth'
import { FakeProfiles } from '../../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { UserNotFoundError } from '../../../domain/errors/auth.errors'
import { SetUserRoleCommand } from './set-user-role.command'
import { SetUserRoleHandler } from './set-user-role.handler'

describe('SetUserRoleHandler', () => {
    it('changes a user’s role and persists it', async () => {
        const user = UserMother.athlete().withId('u1').withEmail('u1@example.com').buildExisting()
        const repo = new InMemoryUserRepository([user])
        const handler = new SetUserRoleHandler(
            repo,
            new FakeClock(),
            new FakeProfiles().set('u1', { username: 'u1', avatarUrl: null, locale: null }),
        )

        const view = await handler.execute(new SetUserRoleCommand('u1', 'coach'))

        expect(view).toMatchObject({ id: 'u1', role: 'coach', username: 'u1' })
        expect((await repo.findById('u1'))?.role.value).toBe('coach')
    })

    it('rejects an unknown user', async () => {
        const handler = new SetUserRoleHandler(new InMemoryUserRepository(), new FakeClock(), new FakeProfiles())

        await expect(handler.execute(new SetUserRoleCommand('ghost', 'coach'))).rejects.toBeInstanceOf(
            UserNotFoundError,
        )
    })
})
