import { Module } from '@nestjs/common'

import { CoachingModule } from '../modules/coaching/coaching.module'
import { Clock, SystemClock } from './clock'
import { PresenceBroadcaster } from './presence-broadcaster'
import { PresenceReadModule } from './presence-read.module'
import { PresenceService } from './presence.service'
import { SettablePresenceBroadcaster } from './settable-presence-broadcaster'

/**
 * Transversal presence module (lives outside `src/modules`, like `src/realtime`).
 * Adds the connection LIFECYCLE (`PresenceService`) on top of the read side
 * (`PresenceReadModule`): ref-counting, the offline grace, and the fan-out to a
 * user's counterparties via `CoachLinks`. The gateway (Chat.2b) registers itself
 * as the broadcaster delegate and drives the service.
 */
@Module({
    // PresenceReadModule → OnlineRegistry/PresenceStore/PresenceReader (shared
    // single instances). CoachingModule → CoachLinks (counterparties to fan out
    // to). RedisModule, DatabaseModule and ObservabilityModule are global.
    imports: [PresenceReadModule, CoachingModule],
    providers: [
        // The gateway (Chat.2b) registers itself as the delegate on init; no-op
        // until then.
        SettablePresenceBroadcaster,
        { provide: PresenceBroadcaster, useExisting: SettablePresenceBroadcaster },
        { provide: Clock, useClass: SystemClock },
        PresenceService,
    ],
    // Re-export the reader (from PresenceReadModule) plus the lifecycle service
    // and the settable broadcaster the gateway registers into.
    exports: [PresenceReadModule, PresenceService, SettablePresenceBroadcaster],
})
export class PresenceModule {}
