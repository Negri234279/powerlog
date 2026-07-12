import { Module, type Provider } from '@nestjs/common'

import { AuthModule } from '../modules/auth/auth.module'
import { PushOnCoachInvitationCreated } from './event-handlers/push-on-coach-invitation-created.handler'
import { PushOnCoachLinkEstablished } from './event-handlers/push-on-coach-link-established.handler'
import { PushOnCoachLinkRemoved } from './event-handlers/push-on-coach-link-removed.handler'
import { PushOnMesocycleAssigned } from './event-handlers/push-on-mesocycle-assigned.handler'
import { PushOnSessionPlanned } from './event-handlers/push-on-session-planned.handler'
import { RealtimeController } from './realtime.controller'
import { RealtimeHub } from './realtime.hub'

/** Turn integration events into pushes on the affected users' streams. */
const EVENT_HANDLERS: Provider[] = [
    PushOnCoachInvitationCreated,
    PushOnCoachLinkEstablished,
    PushOnCoachLinkRemoved,
    PushOnMesocycleAssigned,
    PushOnSessionPlanned,
]

/**
 * Live updates over SSE. Lives outside `src/modules` (like `src/mail` and
 * `src/auth`): it's cross-cutting transport, wired to the feature modules only
 * through the shared integration events they already publish.
 */
@Module({
    // AuthModule for the shared JwtCookieGuard. CqrsModule and ObservabilityModule
    // (the metric providers) are global.
    imports: [AuthModule],
    controllers: [RealtimeController],
    providers: [RealtimeHub, ...EVENT_HANDLERS],
})
export class RealtimeModule {}
