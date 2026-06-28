import { describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakePasswordHasher,
    FakeTokenGenerator,
    InMemoryPasswordResetTokenRepository,
    InMemoryRefreshTokenRepository,
    InMemoryUserRepository,
} from '../../../../../../tests/doubles/auth'
import { PasswordResetTokenMother, RefreshTokenMother, UserMother } from '../../../../../../tests/mothers/auth'
import type { PasswordResetTokenEntity } from '../../../domain/entities/password-reset-token.entity'
import { InvalidPasswordResetTokenError } from '../../../domain/errors/auth.errors'
import { ResetPasswordCommand } from './reset-password.command'
import { ResetPasswordHandler } from './reset-password.handler'

const NOW = new Date('2026-06-01T00:00:00.000Z')
const HASH_FOR = (plain: string) => `$argon2id$v=19$fake$${plain}`

// The handler hashes the raw token; FakeTokenGenerator.hash('reset') === 'hash:reset'.
const activeToken = () =>
    PasswordResetTokenMother.valid().withId('t-1').forUser('u-1').withTokenHash('hash:reset').build()

function setup(opts: { token?: PasswordResetTokenEntity; withUser?: boolean } = {}) {
    const tokens = new InMemoryPasswordResetTokenRepository(opts.token ? [opts.token] : [])
    const users = new InMemoryUserRepository(
        opts.withUser === false
            ? []
            : [UserMother.create().withId('u-1').withPassword(HASH_FOR('old')).buildExisting()],
    )
    const refreshTokens = new InMemoryRefreshTokenRepository([
        RefreshTokenMother.valid().withId('rt-1').forUser('u-1').build(),
    ])
    const handler = new ResetPasswordHandler(
        tokens,
        users,
        refreshTokens,
        new FakePasswordHasher(),
        new FakeTokenGenerator(),
        new FakeClock(NOW),
    )
    return { handler, tokens, users, refreshTokens }
}

describe('ResetPasswordHandler', () => {
    it('sets the new password, consumes the token, and revokes all sessions', async () => {
        const ctx = setup({ token: activeToken() })

        await ctx.handler.execute(new ResetPasswordCommand('reset', 'brandnewpass'))

        expect(ctx.users.all()[0]?.passwordHash?.value).toBe(HASH_FOR('brandnewpass'))
        expect(ctx.tokens.all()[0]?.isConsumed()).toBe(true)
        expect(ctx.refreshTokens.all().every((t) => t.isRevoked())).toBe(true)
    })

    it('rejects an unknown token', async () => {
        const ctx = setup({})
        await expect(ctx.handler.execute(new ResetPasswordCommand('reset', 'brandnewpass'))).rejects.toBeInstanceOf(
            InvalidPasswordResetTokenError,
        )
    })

    it('rejects an expired token', async () => {
        const ctx = setup({
            token: PasswordResetTokenMother.expired().withId('t-1').forUser('u-1').withTokenHash('hash:reset').build(),
        })
        await expect(ctx.handler.execute(new ResetPasswordCommand('reset', 'brandnewpass'))).rejects.toBeInstanceOf(
            InvalidPasswordResetTokenError,
        )
    })

    it('rejects an already-consumed token', async () => {
        const ctx = setup({
            token: PasswordResetTokenMother.consumed().withId('t-1').forUser('u-1').withTokenHash('hash:reset').build(),
        })
        await expect(ctx.handler.execute(new ResetPasswordCommand('reset', 'brandnewpass'))).rejects.toBeInstanceOf(
            InvalidPasswordResetTokenError,
        )
    })

    it('rejects when the user no longer exists', async () => {
        const ctx = setup({ token: activeToken(), withUser: false })
        await expect(ctx.handler.execute(new ResetPasswordCommand('reset', 'brandnewpass'))).rejects.toBeInstanceOf(
            InvalidPasswordResetTokenError,
        )
    })
})
