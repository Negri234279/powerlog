import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { MesocycleWeekGeneratedIntegrationEvent } from '../../shared/integration-events/mesocycle-week-generated.integration-event'
import { RealtimeHub } from '../realtime.hub'

/**
 * The coach materializes a week of the athlete's block: several planned sessions
 * appear in their log at once. If the athlete has their training list open, it
 * refreshes itself instead of showing yesterday's plan.
 *
 * Pushed as `session_planned` rather than a type of its own: from the client's
 * side the two are the same fact — new planned sessions to refetch — and the web
 * already maps that type to the queries this touches.
 */
@EventsHandler(MesocycleWeekGeneratedIntegrationEvent)
export class PushOnMesocycleWeekGenerated implements IEventHandler<MesocycleWeekGeneratedIntegrationEvent> {
    constructor(private readonly hub: RealtimeHub) {}

    handle(event: MesocycleWeekGeneratedIntegrationEvent): void {
        this.hub.publish([event.athleteId], { type: 'session_planned' })
    }
}
