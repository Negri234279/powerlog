import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { CoachInvitationCreatedIntegrationEvent } from '../../shared/integration-events/coach-invitation-created.integration-event'
import { RealtimeHub } from '../realtime.hub'

/** The invited athlete, if they already have an account, sees the invitation land
 *  without reloading. An invite to an address with no account yet has nobody to
 *  push to — that path is the signup email. */
@EventsHandler(CoachInvitationCreatedIntegrationEvent)
export class PushOnCoachInvitationCreated implements IEventHandler<CoachInvitationCreatedIntegrationEvent> {
    constructor(private readonly hub: RealtimeHub) {}

    handle(event: CoachInvitationCreatedIntegrationEvent): void {
        if (event.athleteId === null) return

        this.hub.publish([event.athleteId], { type: 'coach_invitation' })
    }
}
