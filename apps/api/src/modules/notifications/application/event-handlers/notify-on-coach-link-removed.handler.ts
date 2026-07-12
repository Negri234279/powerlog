import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { CoachLinkRemovedIntegrationEvent } from '../../../../shared/integration-events/coach-link-removed.integration-event'
import { NotificationService } from '../services/notification.service'

/**
 * Bells the *other* party when a coaching relationship ends — whoever ended it
 * already knows. Bell only: it is not the kind of news that warrants an email.
 */
@EventsHandler(CoachLinkRemovedIntegrationEvent)
export class NotifyOnCoachLinkRemoved implements IEventHandler<CoachLinkRemovedIntegrationEvent> {
    constructor(private readonly notifications: NotificationService) {}

    async handle(event: CoachLinkRemovedIntegrationEvent): Promise<void> {
        if (event.unlinkedBy === 'coach') {
            await this.notifications.create({
                userId: event.athleteId,
                type: 'coach_unlinked',
                data: { coachId: event.coachId, coachUsername: event.coachUsername },
            })
            return
        }

        await this.notifications.create({
            userId: event.coachId,
            type: 'athlete_unlinked',
            data: { athleteId: event.athleteId, athleteUsername: event.athleteUsername },
        })
    }
}
