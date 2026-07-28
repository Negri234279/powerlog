import { Injectable } from '@nestjs/common'

import { PresenceBroadcaster, type PresenceUpdate } from './presence-broadcaster'

/**
 * A `PresenceBroadcaster` whose real implementation (the WebSocket gateway) is
 * registered at runtime via `setDelegate`, breaking the presence↔gateway module
 * cycle (the gateway needs `PresenceService`, and `PresenceService` needs a
 * broadcaster). Until a delegate is set, emits are no-ops.
 */
@Injectable()
export class SettablePresenceBroadcaster extends PresenceBroadcaster {
    private delegate: PresenceBroadcaster | null = null

    setDelegate(delegate: PresenceBroadcaster): void {
        this.delegate = delegate
    }

    async emit(recipientIds: string[], update: PresenceUpdate): Promise<void> {
        await this.delegate?.emit(recipientIds, update)
    }
}
