import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { CoachInvitationCreatedIntegrationEvent } from '../../shared/integration-events/coach-invitation-created.integration-event'
import { PushCopy } from '../push-copy'
import { PushNotifier } from '../push-notifier'

/**
 * Pushes an existing user when a coach invites them. Only when the invitee
 * already has an account (`athleteId` set) — a not-yet-registered email has no
 * device to push to; that path is an email invite (handled by notifications). The
 * coach's handle already rides on the event, so no directory lookup is needed.
 */
@EventsHandler(CoachInvitationCreatedIntegrationEvent)
export class PushOnCoachInvitation implements IEventHandler<CoachInvitationCreatedIntegrationEvent> {
    constructor(private readonly push: PushNotifier) {}

    async handle(event: CoachInvitationCreatedIntegrationEvent): Promise<void> {
        if (!event.athleteId) return

        await this.push.send([event.athleteId], (locale) => PushCopy.coachInvitation(locale, event.coachUsername))
    }
}
