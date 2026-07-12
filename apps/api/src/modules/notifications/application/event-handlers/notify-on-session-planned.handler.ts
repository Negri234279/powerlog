import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../shared/contracts/user-directory'
import { WorkoutSessionPlannedIntegrationEvent } from '../../../../shared/integration-events/workout-session-planned.integration-event'
import { NotificationService } from '../services/notification.service'

/**
 * Bells the athlete when their coach puts a session on their calendar. No email:
 * planning happens often, and the session shows up in the app anyway.
 */
@EventsHandler(WorkoutSessionPlannedIntegrationEvent)
export class NotifyOnSessionPlanned implements IEventHandler<WorkoutSessionPlannedIntegrationEvent> {
    constructor(
        private readonly notifications: NotificationService,
        private readonly users: UserDirectory,
    ) {}

    async handle(event: WorkoutSessionPlannedIntegrationEvent): Promise<void> {
        const coach = await this.users.getContact(event.coachId)

        await this.notifications.create({
            userId: event.athleteId,
            type: 'session_planned',
            data: {
                sessionId: event.sessionId,
                coachId: event.coachId,
                coachUsername: coach?.username ?? '',
                performedAt: event.performedAt.toISOString(),
            },
        })
    }
}
