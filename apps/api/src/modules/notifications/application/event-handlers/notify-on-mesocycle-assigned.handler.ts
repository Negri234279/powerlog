import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../shared/contracts/user-directory'
import { MesocycleAssignedIntegrationEvent } from '../../../../shared/integration-events/mesocycle-assigned.integration-event'
import { NotificationService } from '../services/notification.service'

/** Bells the athlete when their coach hands them a training block. */
@EventsHandler(MesocycleAssignedIntegrationEvent)
export class NotifyOnMesocycleAssigned implements IEventHandler<MesocycleAssignedIntegrationEvent> {
    constructor(
        private readonly notifications: NotificationService,
        private readonly users: UserDirectory,
    ) {}

    async handle(event: MesocycleAssignedIntegrationEvent): Promise<void> {
        const coach = await this.users.getContact(event.coachId)

        await this.notifications.create({
            userId: event.athleteId,
            type: 'mesocycle_assigned',
            data: {
                mesocycleId: event.mesocycleId,
                name: event.name,
                coachId: event.coachId,
                coachUsername: coach?.username ?? '',
            },
        })
    }
}
