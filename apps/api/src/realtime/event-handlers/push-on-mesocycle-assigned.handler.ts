import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { MesocycleAssignedIntegrationEvent } from '../../shared/integration-events/mesocycle-assigned.integration-event'
import { RealtimeHub } from '../realtime.hub'

/** A training block landing in the athlete's plan while they have the app open. */
@EventsHandler(MesocycleAssignedIntegrationEvent)
export class PushOnMesocycleAssigned implements IEventHandler<MesocycleAssignedIntegrationEvent> {
    constructor(private readonly hub: RealtimeHub) {}

    handle(event: MesocycleAssignedIntegrationEvent): void {
        this.hub.publish([event.athleteId], { type: 'mesocycle_assigned' })
    }
}
