import { describe, expect, it } from 'vitest'

import {
    FakeAuthConfig,
    FakeClock,
    FakeTokenGenerator,
    InMemoryEmailVerificationTokenRepository,
    InMemoryUserRepository,
} from '../../../../../../tests/doubles/auth'
import { FakeMailer } from '../../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { EmailAlreadyVerifiedError, UserNotFoundError } from '../../../domain/errors/auth.errors'
import { EmailVerificationIssuer } from '../../services/email-verification-issuer.service'
import { ResendEmailVerificationCommand } from './resend-email-verification.command'
import { ResendEmailVerificationHandler } from './resend-email-verification.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup(user: ReturnType<UserMother['buildExisting']> | null) {
    const users = new InMemoryUserRepository(user ? [user] : [])
    const tokens = new InMemoryEmailVerificationTokenRepository()
    const mailer = new FakeMailer()
    const issuer = new EmailVerificationIssuer(
        tokens,
        new FakeTokenGenerator(),
        mailer,
        new FakeClock(NOW),
        new FakeAuthConfig(),
    )
    const handler = new ResendEmailVerificationHandler(users, issuer)
    return { handler, tokens, mailer }
}

describe('ResendEmailVerificationHandler', () => {
    it('issues a new token and sends the email for an unverified user', async () => {
        const user = UserMother.create().withId('u-1').withEmail('rafa@example.com').buildExisting()
        const ctx = setup(user)

        await ctx.handler.execute(new ResendEmailVerificationCommand('u-1'))

        expect(ctx.tokens.all()).toHaveLength(1)
        expect(ctx.mailer.sent).toHaveLength(1)
        expect(ctx.mailer.last()?.to).toBe('rafa@example.com')
    })

    it('rejects an already-verified user and sends nothing', async () => {
        const user = UserMother.create().withId('u-1').emailVerified().buildExisting()
        const ctx = setup(user)

        await expect(ctx.handler.execute(new ResendEmailVerificationCommand('u-1'))).rejects.toBeInstanceOf(
            EmailAlreadyVerifiedError,
        )
        expect(ctx.mailer.sent).toHaveLength(0)
    })

    it('rejects an unknown user', async () => {
        const ctx = setup(null)
        await expect(ctx.handler.execute(new ResendEmailVerificationCommand('ghost'))).rejects.toBeInstanceOf(
            UserNotFoundError,
        )
    })
})
