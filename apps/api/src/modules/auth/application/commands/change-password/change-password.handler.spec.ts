import { describe, expect, it } from 'vitest'

import { FakeClock, FakePasswordHasher, InMemoryUserRepository } from '../../../../../../tests/doubles/auth'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { InvalidCurrentPasswordError, UserNotFoundError } from '../../../domain/errors/auth.errors'
import { ChangePasswordCommand } from './change-password.command'
import { ChangePasswordHandler } from './change-password.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')
// FakePasswordHasher.hash(plain) === `$argon2id$v=19$fake$${plain}`.
const HASH_FOR = (plain: string) => `$argon2id$v=19$fake$${plain}`

function setup(user: ReturnType<UserMother['buildExisting']> | null) {
    const users = new InMemoryUserRepository(user ? [user] : [])
    const handler = new ChangePasswordHandler(users, new FakePasswordHasher(), new FakeClock(NOW))
    return { users, handler }
}

describe('ChangePasswordHandler', () => {
    it('changes the password when the current one matches', async () => {
        const user = UserMother.create().withId('u-1').withPassword(HASH_FOR('oldpass')).buildExisting()
        const ctx = setup(user)

        await ctx.handler.execute(new ChangePasswordCommand('u-1', 'newpassword', 'oldpass'))

        expect(ctx.users.all()[0]?.passwordHash?.value).toBe(HASH_FOR('newpassword'))
    })

    it('rejects a wrong current password', async () => {
        const user = UserMother.create().withId('u-1').withPassword(HASH_FOR('oldpass')).buildExisting()
        const ctx = setup(user)

        await expect(
            ctx.handler.execute(new ChangePasswordCommand('u-1', 'newpassword', 'wrong')),
        ).rejects.toBeInstanceOf(InvalidCurrentPasswordError)
    })

    it('rejects a missing current password when the account has one', async () => {
        const user = UserMother.create().withId('u-1').withPassword(HASH_FOR('oldpass')).buildExisting()
        const ctx = setup(user)

        await expect(ctx.handler.execute(new ChangePasswordCommand('u-1', 'newpassword'))).rejects.toBeInstanceOf(
            InvalidCurrentPasswordError,
        )
    })

    it('sets a password for a Google-only account without a current one', async () => {
        const user = UserMother.create().withId('u-1').withoutPassword().buildExisting()
        const ctx = setup(user)

        await ctx.handler.execute(new ChangePasswordCommand('u-1', 'newpassword'))

        expect(ctx.users.all()[0]?.hasPassword()).toBe(true)
        expect(ctx.users.all()[0]?.passwordHash?.value).toBe(HASH_FOR('newpassword'))
    })

    it('throws when the user does not exist', async () => {
        const ctx = setup(null)
        await expect(ctx.handler.execute(new ChangePasswordCommand('ghost', 'newpassword'))).rejects.toBeInstanceOf(
            UserNotFoundError,
        )
    })
})
