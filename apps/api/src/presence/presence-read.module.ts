import { Module, type Provider } from '@nestjs/common'

import { REDIS, type RedisClient } from '../redis/redis.module'
import { CompositePresenceReader } from './composite-presence-reader'
import { DrizzlePresenceStore } from './infrastructure/drizzle-presence-store'
import { InMemoryOnlineRegistry } from './online/in-memory-online-registry'
import { OnlineRegistry } from './online/online-registry'
import { RedisOnlineRegistry } from './online/redis-online-registry'
import { PresenceReader } from './presence-reader'
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
 * The READ side of presence: the online registry, the durable store and the
 * `PresenceReader` facade over both — with NO dependency on coaching. Split out
 * from `PresenceModule` so consumers that only need to read presence (auth's
 * admin detail) can import it without pulling in `CoachingModule`, which would
 * form a cycle (`AuthModule → PresenceModule → CoachingModule → AuthModule`).
 * The lifecycle service (which does need `CoachLinks`) stays in `PresenceModule`,
 * which imports this and shares the single `OnlineRegistry` instance.
 */
@Module({
    // RedisModule (REDIS) and DatabaseModule (DRIZZLE) are global.
    providers: [
        ONLINE_REGISTRY,
        { provide: PresenceStore, useClass: DrizzlePresenceStore },
        { provide: PresenceReader, useClass: CompositePresenceReader },
    ],
    exports: [PresenceReader, OnlineRegistry, PresenceStore],
})
export class PresenceReadModule {}
