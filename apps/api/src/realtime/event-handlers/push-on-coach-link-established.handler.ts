import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { CoachLinkEstablishedIntegrationEvent } from '../../shared/integration-events/coach-link-established.integration-event'
import { RealtimeHub } from '../realtime.hub'

/** The moment an athlete accepts, a coach sitting on /coaching sees them appear —
 *  and the athlete's own coach list updates on whichever tab they left open. */
@EventsHandler(CoachLinkEstablishedIntegrationEvent)
export class PushOnCoachLinkEstablished implements IEventHandler<CoachLinkEstablishedIntegrationEvent> {
    constructor(private readonly hub: RealtimeHub) {}

    handle(event: CoachLinkEstablishedIntegrationEvent): void {
        this.hub.publish([event.coachId], { type: 'athlete_linked' })
        this.hub.publish([event.athleteId], { type: 'coach_linked' })
    }
}
