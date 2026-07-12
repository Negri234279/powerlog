import { Module, type Provider } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'

import { AuthModule } from '../modules/auth/auth.module'
import { REDIS, type RedisClient } from '../redis/redis.module'
import { InMemoryRealtimeBus } from './bus/in-memory-realtime.bus'
import { RedisRealtimeBus } from './bus/redis-realtime.bus'
import { PushOnCoachInvitationCreated } from './event-handlers/push-on-coach-invitation-created.handler'
import { PushOnCoachLinkEstablished } from './event-handlers/push-on-coach-link-established.handler'
import { PushOnCoachLinkRemoved } from './event-handlers/push-on-coach-link-removed.handler'
import { PushOnMesocycleAssigned } from './event-handlers/push-on-mesocycle-assigned.handler'
import { PushOnSessionPlanned } from './event-handlers/push-on-session-planned.handler'
import { RealtimeBus } from './realtime.bus'
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

/** Redis when it's configured, in-process otherwise — see RealtimeBus. Nest runs
 *  the lifecycle hooks (subscribe / quit) on the instance either way. */
const BUS: Provider = {
    provide: RealtimeBus,
    inject: [REDIS, PinoLogger],
    useFactory: (redis: RedisClient, logger: PinoLogger): RealtimeBus =>
        redis ? new RedisRealtimeBus(redis, logger) : new InMemoryRealtimeBus(),
}

/**
 * Live updates over SSE. Lives outside `src/modules` (like `src/mail` and
 * `src/auth`): it's cross-cutting transport, wired to the feature modules only
 * through the shared integration events they already publish.
 */
@Module({
    // AuthModule for the shared JwtCookieGuard. CqrsModule, RedisModule and
    // ObservabilityModule (the metric providers) are global.
    imports: [AuthModule],
    controllers: [RealtimeController],
    providers: [BUS, RealtimeHub, ...EVENT_HANDLERS],
})
export class RealtimeModule {}
