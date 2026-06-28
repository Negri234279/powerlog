import { Logger } from '@nestjs/common'
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../shared/contracts/user-directory'
import { CoachInvitationCreatedIntegrationEvent } from '../../../../shared/integration-events/coach-invitation-created.integration-event'
import { NotificationService } from '../services/notification.service'

/**
 * Drops a `coach_invitation` bell entry (and email) into the athlete's inbox
 * when a coach invites them. The athlete's email is resolved through the shared
 * UserDirectory; if it can't be resolved the bell entry is still created.
 */
@EventsHandler(CoachInvitationCreatedIntegrationEvent)
export class NotifyOnCoachInvitationCreated implements IEventHandler<CoachInvitationCreatedIntegrationEvent> {
    private readonly logger = new Logger(NotifyOnCoachInvitationCreated.name)

    constructor(
        private readonly notifications: NotificationService,
        private readonly users: UserDirectory,
    ) {}

    async handle(event: CoachInvitationCreatedIntegrationEvent): Promise<void> {
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
