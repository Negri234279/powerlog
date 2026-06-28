import { describe, expect, it } from 'vitest'

import { Mailer } from '../../../../mail/mailer.port'
import {
    FakeAuthConfig,
    FakeClock,
    FakeTokenGenerator,
    InMemoryEmailVerificationTokenRepository,
} from '../../../../../tests/doubles/auth'
import { FakeMailer } from '../../../../../tests/doubles/shared'
import { UserRegisteredIntegrationEvent } from '../../../../shared/integration-events/user-registered.integration-event'
import { EmailVerificationIssuer } from '../services/email-verification-issuer.service'
import { SendEmailVerificationOnUserRegistered } from './send-email-verification-on-user-registered.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup(mailer: Mailer = new FakeMailer()) {
    const tokens = new InMemoryEmailVerificationTokenRepository()
    const issuer = new EmailVerificationIssuer(
        tokens,
        new FakeTokenGenerator(),
        mailer,
        new FakeClock(NOW),
        new FakeAuthConfig(),
    )
    const handler = new SendEmailVerificationOnUserRegistered(issuer)
    return { handler, tokens, mailer }
}

describe('SendEmailVerificationOnUserRegistered', () => {
    it('sends a verification email for a password registration', async () => {
        const mailer = new FakeMailer()
        const { handler, tokens } = setup(mailer)

        await handler.handle(new UserRegisteredIntegrationEvent('u-1', 'rafa@example.com', 'password'))

        expect(tokens.all()).toHaveLength(1)
        expect(mailer.sent).toHaveLength(1)
        expect(mailer.last()?.to).toBe('rafa@example.com')
    })

    it('skips Google registrations (already verified)', async () => {
        const mailer = new FakeMailer()
        const { handler, tokens } = setup(mailer)

        await handler.handle(new UserRegisteredIntegrationEvent('u-1', 'rafa@example.com', 'google'))

        expect(tokens.all()).toHaveLength(0)
        expect(mailer.sent).toHaveLength(0)
    })

    it('swallows a mail failure (best-effort; account already created)', async () => {
        const throwingMailer: Mailer = {
            send: async () => {
                throw new Error('smtp down')
            },
        }
        const { handler } = setup(throwingMailer)

        await expect(
            handler.handle(new UserRegisteredIntegrationEvent('u-1', 'rafa@example.com', 'password')),
        ).resolves.toBeUndefined()
    })
})
