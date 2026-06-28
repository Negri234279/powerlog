import { Injectable } from '@nestjs/common'

import { Mailer } from '../../../../mail/mailer.port'
import { EmailVerificationTokenRepository } from '../../domain/repositories/email-verification-token.repository'
import { AuthConfig } from '../ports/auth-config.port'
import { Clock } from '../ports/clock.port'
import { OpaqueTokenGenerator } from '../ports/opaque-token-generator.port'

/**
 * Issues an email-verification token (persisting only its hash) and emails the
 * confirmation link. Shared by the on-register event handler and the resend
 * command. Persists the token before sending, so a mail outage still leaves a
 * usable token (the user can resend).
 */
@Injectable()
export class EmailVerificationIssuer {
    constructor(
        private readonly tokens: EmailVerificationTokenRepository,
        private readonly tokenGenerator: OpaqueTokenGenerator,
        private readonly mailer: Mailer,
        private readonly clock: Clock,
        private readonly config: AuthConfig,
    ) {}

    async issue(userId: string, email: string): Promise<void> {
        const { raw, hash } = this.tokenGenerator.generate()
        const expiresAt = new Date(this.clock.now().getTime() + this.config.emailVerificationTtlMs)

        await this.tokens.create({ userId, tokenHash: hash, expiresAt })

        const verifyUrl = `${this.config.webOrigin}/verify-email?token=${encodeURIComponent(raw)}`

        await this.mailer.send({
            to: email,
            subject: 'Confirm your PowerLog email',
            html: this.html(verifyUrl),
            text: `Confirm your email by visiting: ${verifyUrl}`,
            tag: 'email_verification',
        })
    }

    private html(verifyUrl: string): string {
        return [
            '<p>Welcome to PowerLog! Confirm your email to finish setting up your account.</p>',
            `<p><a href="${verifyUrl}">Confirm my email</a></p>`,
            `<p>If the button doesn't work, paste this link into your browser:<br>${verifyUrl}</p>`,
        ].join('\n')
    }
}
