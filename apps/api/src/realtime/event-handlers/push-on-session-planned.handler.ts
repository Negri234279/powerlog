import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { WorkoutSessionPlannedIntegrationEvent } from '../../shared/integration-events/workout-session-planned.integration-event'
import { RealtimeHub } from '../realtime.hub'

/** A session the coach just planned shows up in the athlete's history live. */
@EventsHandler(WorkoutSessionPlannedIntegrationEvent)
export class PushOnSessionPlanned implements IEventHandler<WorkoutSessionPlannedIntegrationEvent> {
    constructor(private readonly hub: RealtimeHub) {}

    handle(event: WorkoutSessionPlannedIntegrationEvent): void {
        this.hub.publish([event.athleteId], { type: 'session_planned' })
    }
}
