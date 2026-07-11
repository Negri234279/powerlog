import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { CoachLinkEstablishedIntegrationEvent } from '../../../../shared/integration-events/coach-link-established.integration-event'
import { NotificationService } from '../services/notification.service'

/**
 * Drops bell entries into both inboxes when a coach↔athlete link is established:
 * the coach learns a new athlete joined, and the athlete sees who now coaches
 * them. Email is intentionally skipped here — the invitation already emailed.
 */
@EventsHandler(CoachLinkEstablishedIntegrationEvent)
export class NotifyOnCoachLinkEstablished implements IEventHandler<CoachLinkEstablishedIntegrationEvent> {
    constructor(private readonly notifications: NotificationService) {}

    async handle(event: CoachLinkEstablishedIntegrationEvent): Promise<void> {
        await this.notifications.create({
            userId: event.coachId,
            type: 'athlete_linked',
            data: { athleteId: event.athleteId, athleteUsername: event.athleteUsername },
        })

        await this.notifications.create({
            userId: event.athleteId,
            type: 'coach_linked',
            data: { coachId: event.coachId, coachUsername: event.coachUsername },
        })
    }
}
