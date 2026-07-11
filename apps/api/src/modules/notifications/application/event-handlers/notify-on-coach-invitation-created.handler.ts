import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import type { Env } from '../../../../config/env'
import { Mailer } from '../../../../mail/mailer.port'
import { UserDirectory } from '../../../../shared/contracts/user-directory'
import { CoachInvitationCreatedIntegrationEvent } from '../../../../shared/integration-events/coach-invitation-created.integration-event'
import { NotificationService } from '../services/notification.service'

/**
 * Reacts to a coach invitation. If the invitee already has an account, drops a
 * `coach_invitation` bell (+ email) into their inbox. If the email has no account
 * yet, sends an email-only signup invite with a link — there's no user to bell,
 * and the coaching module auto-links them on registration.
 */
@EventsHandler(CoachInvitationCreatedIntegrationEvent)
export class NotifyOnCoachInvitationCreated implements IEventHandler<CoachInvitationCreatedIntegrationEvent> {
    private readonly logger = new Logger(NotifyOnCoachInvitationCreated.name)

    constructor(
        private readonly notifications: NotificationService,
        private readonly users: UserDirectory,
        private readonly mailer: Mailer,
        private readonly config: ConfigService<Env, true>,
    ) {}

    async handle(event: CoachInvitationCreatedIntegrationEvent): Promise<void> {
        if (event.athleteId) {
            const contact = await this.contactOf(event.athleteId)
            await this.notifications.create({
                userId: event.athleteId,
                type: 'coach_invitation',
                data: {
                    invitationId: event.invitationId,
                    coachId: event.coachId,
                    coachUsername: event.coachUsername,
                },
                email: contact?.email
                    ? {
                          to: contact.email,
                          subject: `${event.coachUsername} wants to coach you on powerlog`,
                          html: `<p><strong>${event.coachUsername}</strong> invited you to connect as your coach on powerlog. Open the app to accept or decline.</p>`,
                          text: `${event.coachUsername} invited you to connect as your coach on powerlog. Open the app to accept or decline.`,
                      }
                    : undefined,
            })
            return
        }

        // No account yet: email-only signup invite (no bell — there's no user).
        const webOrigin = this.config.get('WEB_ORIGIN', { infer: true })
        const signupUrl = `${webOrigin}/register?invite=${event.invitationId}`
        try {
            await this.mailer.send({
                to: event.email,
                subject: `${event.coachUsername} wants to coach you on powerlog`,
                html: `<p><strong>${event.coachUsername}</strong> invited you to train with them on powerlog. <a href="${signupUrl}">Create your account</a> to get started — you'll be connected automatically.</p>`,
                text: `${event.coachUsername} invited you to train with them on powerlog. Sign up to get started: ${signupUrl}`,
                tag: 'coach_invitation',
            })
        } catch (err) {
            this.logger.error(`Failed to send coach-invitation signup email to ${event.email}: ${String(err)}`)
        }
    }

    /** Best-effort contact lookup; never blocks creating the bell entry. */
    private async contactOf(athleteId: string): Promise<{ email: string } | null> {
        try {
            return await this.users.getContact(athleteId)
        } catch (err) {
            this.logger.error(`Failed to resolve contact for athlete ${athleteId}: ${String(err)}`)
            return null
        }
    }
}
