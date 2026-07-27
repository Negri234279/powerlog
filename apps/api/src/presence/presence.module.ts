import { Module, type Provider } from '@nestjs/common'

import { CoachingModule } from '../modules/coaching/coaching.module'
import { REDIS, type RedisClient } from '../redis/redis.module'
import { Clock, SystemClock } from './clock'
import { CompositePresenceReader } from './composite-presence-reader'
import { DrizzlePresenceStore } from './infrastructure/drizzle-presence-store'
import { InMemoryOnlineRegistry } from './online/in-memory-online-registry'
import { OnlineRegistry } from './online/online-registry'
import { RedisOnlineRegistry } from './online/redis-online-registry'
import { PresenceBroadcaster, NullPresenceBroadcaster } from './presence-broadcaster'
import { PresenceReader } from './presence-reader'
import { PresenceService } from './presence.service'
import { PresenceStore } from './presence-store'

/** Redis across instances, in-memory otherwise — same `REDIS_URL` switch as the
 *  realtime bus. Answers "online in ANY process". */
const ONLINE_REGISTRY: Provider = {
    provide: OnlineRegistry,
    inject: [REDIS],
    useFactory: (redis: RedisClient): OnlineRegistry =>
        redis ? new RedisOnlineRegistry(redis) : new InMemoryOnlineRegistry(),
}

/**
 * Transversal presence module (lives outside `src/modules`, like `src/realtime`).
 * Tracks who is connected to the realtime socket and exposes `PresenceReader` to
 * chat and admin. Chat.2a: durable store, reader and lifecycle service with a
 * no-op broadcaster; Chat.2b binds the broadcaster + drives the service from the
 * Socket.IO gateway.
 */
@Module({
    // CoachingModule exports CoachLinks (counterparties to fan presence out to).
    // RedisModule, DatabaseModule and ObservabilityModule are global.
    imports: [CoachingModule],
    providers: [
        ONLINE_REGISTRY,
        { provide: PresenceStore, useClass: DrizzlePresenceStore },
        { provide: PresenceReader, useClass: CompositePresenceReader },
        // No-op until Chat.2b swaps in the WebSocket gateway.
        { provide: PresenceBroadcaster, useClass: NullPresenceBroadcaster },
        { provide: Clock, useClass: SystemClock },
        PresenceService,
    ],
    exports: [PresenceReader, PresenceService],
})
export class PresenceModule {}
