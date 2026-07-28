import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../shared/contracts/user-directory'
import { MesocycleAssignedIntegrationEvent } from '../../shared/integration-events/mesocycle-assigned.integration-event'
import { PushCopy } from '../push-copy'
import { PushNotifier } from '../push-notifier'

/** Pushes the athlete when their coach assigns them a training block. */
@EventsHandler(MesocycleAssignedIntegrationEvent)
export class PushOnMesocycleAssigned implements IEventHandler<MesocycleAssignedIntegrationEvent> {
    constructor(
        private readonly push: PushNotifier,
        private readonly users: UserDirectory,
    ) {}

    async handle(event: MesocycleAssignedIntegrationEvent): Promise<void> {
        const coach = await this.users.getContact(event.coachId)
        const coachName = coach?.username ?? ''

        await this.push.send([event.athleteId], (locale) => PushCopy.mesocycleAssigned(locale, coachName, event.name))
    }
}
