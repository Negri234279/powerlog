import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { CoachLinkRemovedIntegrationEvent } from '../../shared/integration-events/coach-link-removed.integration-event'
import { RealtimeHub } from '../realtime.hub'

/** Either side ending the relationship drops the other's list entry live — which
 *  matters most for the coach, who loses read access to the athlete at once. */
@EventsHandler(CoachLinkRemovedIntegrationEvent)
export class PushOnCoachLinkRemoved implements IEventHandler<CoachLinkRemovedIntegrationEvent> {
    constructor(private readonly hub: RealtimeHub) {}

    handle(event: CoachLinkRemovedIntegrationEvent): void {
        this.hub.publish([event.coachId], { type: 'athlete_unlinked' })
        this.hub.publish([event.athleteId], { type: 'coach_unlinked' })
    }
}
