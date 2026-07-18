import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryUserRepository } from '../../../../../../tests/doubles/auth'
import { FakeEntitlements, FakeProfiles } from '../../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { CannotRevokeOwnAdminError, UserNotFoundError } from '../../../domain/errors/auth.errors'
import { SetUserAdminCommand } from './set-user-admin.command'
import { SetUserAdminHandler } from './set-user-admin.handler'

function setup() {
    const admin = UserMother.admin().withId('admin-id').withEmail('admin@example.com').buildExisting()
    const target = UserMother.athlete().withId('target-id').withEmail('target@example.com').buildExisting()
    const repo = new InMemoryUserRepository([admin, target])
    const profiles = new FakeProfiles().set('target-id', { username: 'targetuser', avatarUrl: null, locale: null })
    const handler = new SetUserAdminHandler(
        repo,
        new FakeClock(),
        profiles,
        new FakeEntitlements().onAthlete({ plan: 'athlete-free' }).withoutCoach(),
    )
    return { repo, handler }
}

describe('SetUserAdminHandler', () => {
    it('grants admin to another user and enriches the view with their handle', async () => {
        const { repo, handler } = setup()

        const view = await handler.execute(new SetUserAdminCommand('admin-id', 'target-id', true))

        expect(view).toMatchObject({
            id: 'target-id',
            isAdmin: true,
            username: 'targetuser',
            // Admin is orthogonal to billing: granting it leaves the plan alone.
            plan: 'athlete-free',
        })
        expect((await repo.findById('target-id'))?.isAdmin).toBe(true)
    })

    it('refuses to revoke the acting admin’s own access', async () => {
        const { repo, handler } = setup()

        await expect(handler.execute(new SetUserAdminCommand('admin-id', 'admin-id', false))).rejects.toBeInstanceOf(
            CannotRevokeOwnAdminError,
        )
        expect((await repo.findById('admin-id'))?.isAdmin).toBe(true)
    })

    it('rejects an unknown target', async () => {
        const { handler } = setup()

        await expect(handler.execute(new SetUserAdminCommand('admin-id', 'ghost', true))).rejects.toBeInstanceOf(
            UserNotFoundError,
        )
    })
})
