import { Logger } from '@nestjs/common'
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserRegisteredIntegrationEvent } from '../../../../shared/integration-events/user-registered.integration-event'
import { EmailVerificationIssuer } from '../services/email-verification-issuer.service'

/**
 * Sends the verification email after a password registration. Google accounts
 * are verified at creation, so they're skipped. Best-effort: a mail outage is
 * logged, not propagated (the user can resend); the account is already created.
 */
@EventsHandler(UserRegisteredIntegrationEvent)
export class SendEmailVerificationOnUserRegistered implements IEventHandler<UserRegisteredIntegrationEvent> {
    private readonly logger = new Logger(SendEmailVerificationOnUserRegistered.name)

    constructor(private readonly verification: EmailVerificationIssuer) {}

    async handle(event: UserRegisteredIntegrationEvent): Promise<void> {
        if (event.source !== 'password') return

        try {
            await this.verification.issue(event.userId, event.email)
        } catch (err) {
            this.logger.error(`Failed to send verification email for user ${event.userId}: ${String(err)}`)
        }
    }
}
