import { Injectable } from '@nestjs/common'

import { Mailer } from '../../../../mail/mailer.port'
import { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository'
import { AuthConfig } from '../ports/auth-config.port'
import { Clock } from '../ports/clock.port'
import { OpaqueTokenGenerator } from '../ports/opaque-token-generator.port'

/**
 * Issues a password-reset token (persisting only its hash) and emails the reset
 * link. Persists before sending, so a mail outage still leaves a usable token.
 */
@Injectable()
export class PasswordResetIssuer {
    constructor(
        private readonly tokens: PasswordResetTokenRepository,
        private readonly tokenGenerator: OpaqueTokenGenerator,
        private readonly mailer: Mailer,
        private readonly clock: Clock,
        private readonly config: AuthConfig,
    ) {}

    async issue(userId: string, email: string): Promise<void> {
        const { raw, hash } = this.tokenGenerator.generate()
        const expiresAt = new Date(this.clock.now().getTime() + this.config.passwordResetTtlMs)
        await this.tokens.create({ userId, tokenHash: hash, expiresAt })

        const resetUrl = `${this.config.webOrigin}/reset-password?token=${encodeURIComponent(raw)}`

        await this.mailer.send({
            to: email,
            subject: 'Reset your PowerLog password',
            html: this.html(resetUrl),
            text: `Reset your password by visiting: ${resetUrl}`,
            tag: 'password_reset',
        })
    }

    private html(resetUrl: string): string {
        return [
            '<p>We received a request to reset your PowerLog password.</p>',
            `<p><a href="${resetUrl}">Reset my password</a></p>`,
            "<p>If you didn't request this, you can safely ignore this email.</p>",
        ].join('\n')
    }
}
