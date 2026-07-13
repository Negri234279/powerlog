import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../shared/contracts/user-directory'
import { MesocycleWeekGeneratedIntegrationEvent } from '../../../../shared/integration-events/mesocycle-week-generated.integration-event'
import { NotificationService } from '../services/notification.service'

/**
 * Bells the athlete when their coach materializes a week of their block: several
 * sessions land in their log at once. One entry for the whole week — the event
 * itself is already per-week, which is what keeps this from becoming six bells for
 * one action. No email: the sessions show up in the app anyway.
 */
@EventsHandler(MesocycleWeekGeneratedIntegrationEvent)
export class NotifyOnMesocycleWeekGenerated implements IEventHandler<MesocycleWeekGeneratedIntegrationEvent> {
    constructor(
        private readonly notifications: NotificationService,
        private readonly users: UserDirectory,
    ) {}

    async handle(event: MesocycleWeekGeneratedIntegrationEvent): Promise<void> {
        const coach = await this.users.getContact(event.coachId)

        await this.notifications.create({
            userId: event.athleteId,
            type: 'mesocycle_week_generated',
            data: {
                mesocycleId: event.mesocycleId,
                week: event.week,
                sessions: event.sessions,
                coachId: event.coachId,
                coachUsername: coach?.username ?? '',
            },
        })
    }
}
