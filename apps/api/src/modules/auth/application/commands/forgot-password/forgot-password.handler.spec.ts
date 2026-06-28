import { describe, expect, it } from 'vitest'

import {
    FakeAuthConfig,
    FakeClock,
    FakeTokenGenerator,
    InMemoryPasswordResetTokenRepository,
    InMemoryUserRepository,
} from '../../../../../../tests/doubles/auth'
import { FakeMailer } from '../../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { PasswordResetIssuer } from '../../services/password-reset-issuer.service'
import { ForgotPasswordCommand } from './forgot-password.command'
import { ForgotPasswordHandler } from './forgot-password.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup(user: ReturnType<UserMother['buildExisting']> | null) {
    const users = new InMemoryUserRepository(user ? [user] : [])
    const tokens = new InMemoryPasswordResetTokenRepository()
    const mailer = new FakeMailer()
    const issuer = new PasswordResetIssuer(
        tokens,
        new FakeTokenGenerator(),
        mailer,
        new FakeClock(NOW),
        new FakeAuthConfig(),
    )
    const handler = new ForgotPasswordHandler(users, issuer)
    return { handler, tokens, mailer }
}

describe('ForgotPasswordHandler', () => {
    it('issues a reset token and emails the link for a known address', async () => {
        const user = UserMother.create().withId('u-1').withEmail('rafa@example.com').buildExisting()
        const ctx = setup(user)

        await ctx.handler.execute(new ForgotPasswordCommand('rafa@example.com'))

        expect(ctx.tokens.all()).toHaveLength(1)
        expect(ctx.mailer.last()?.to).toBe('rafa@example.com')
    })

    it('succeeds silently for an unknown address (no token, no email)', async () => {
        const ctx = setup(null)

        await expect(ctx.handler.execute(new ForgotPasswordCommand('nobody@example.com'))).resolves.toBeUndefined()
        expect(ctx.tokens.all()).toHaveLength(0)
        expect(ctx.mailer.sent).toHaveLength(0)
    })
})
