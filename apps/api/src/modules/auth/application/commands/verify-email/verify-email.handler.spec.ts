import { describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeTokenGenerator,
    InMemoryEmailVerificationTokenRepository,
    InMemoryUserRepository,
} from '../../../../../../tests/doubles/auth'
import { EmailVerificationTokenMother, UserMother } from '../../../../../../tests/mothers/auth'
import { InvalidEmailVerificationTokenError } from '../../../domain/errors/auth.errors'
import { VerifyEmailCommand } from './verify-email.command'
import { VerifyEmailHandler } from './verify-email.handler'

const NOW = new Date('2026-06-01T00:00:00.000Z')

// The handler hashes the raw token; FakeTokenGenerator.hash('tok') === 'hash:tok'.
function setup(opts: { token?: ReturnType<EmailVerificationTokenMother['build']>; withUser?: boolean } = {}) {
    const tokens = new InMemoryEmailVerificationTokenRepository(opts.token ? [opts.token] : [])
    const users = new InMemoryUserRepository(
        opts.withUser === false ? [] : [UserMother.create().withId('u-1').buildExisting()],
    )
    const handler = new VerifyEmailHandler(tokens, users, new FakeTokenGenerator(), new FakeClock(NOW))
    return { handler, tokens, users }
}

const activeToken = () =>
    EmailVerificationTokenMother.valid().withId('t-1').forUser('u-1').withTokenHash('hash:tok').build()

describe('VerifyEmailHandler', () => {
    it('verifies the user and consumes the token', async () => {
        const ctx = setup({ token: activeToken() })

        await ctx.handler.execute(new VerifyEmailCommand('tok'))

        expect(ctx.users.all()[0]?.isEmailVerified()).toBe(true)
        expect(ctx.tokens.all()[0]?.isConsumed()).toBe(true)
    })

    it('rejects an unknown token', async () => {
        const ctx = setup({})
        await expect(ctx.handler.execute(new VerifyEmailCommand('tok'))).rejects.toBeInstanceOf(
            InvalidEmailVerificationTokenError,
        )
    })

    it('rejects an expired token', async () => {
        const ctx = setup({
            token: EmailVerificationTokenMother.expired()
                .withId('t-1')
                .forUser('u-1')
                .withTokenHash('hash:tok')
                .build(),
        })
        await expect(ctx.handler.execute(new VerifyEmailCommand('tok'))).rejects.toBeInstanceOf(
            InvalidEmailVerificationTokenError,
        )
    })

    it('rejects an already-consumed token', async () => {
        const ctx = setup({
            token: EmailVerificationTokenMother.consumed()
                .withId('t-1')
                .forUser('u-1')
                .withTokenHash('hash:tok')
                .build(),
        })
        await expect(ctx.handler.execute(new VerifyEmailCommand('tok'))).rejects.toBeInstanceOf(
            InvalidEmailVerificationTokenError,
        )
    })

    it('rejects when the user no longer exists', async () => {
        const ctx = setup({ token: activeToken(), withUser: false })
        await expect(ctx.handler.execute(new VerifyEmailCommand('tok'))).rejects.toBeInstanceOf(
            InvalidEmailVerificationTokenError,
        )
    })
})
