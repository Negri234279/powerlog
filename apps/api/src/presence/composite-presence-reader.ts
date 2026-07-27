import { Injectable } from '@nestjs/common'

import { OnlineRegistry } from './online/online-registry'
import { PresenceReader, type PresenceSnapshot } from './presence-reader'
import { PresenceStore } from './presence-store'

/**
 * `PresenceReader` over the two sources of truth: the live `OnlineRegistry` for
 * "online now" and the durable `PresenceStore` for "last seen". Neither alone is
 * the answer — a connected user has no meaningful last-seen, and an offline one
 * only has that.
 */
@Injectable()
export class CompositePresenceReader extends PresenceReader {
    constructor(
        private readonly online: OnlineRegistry,
        private readonly store: PresenceStore,
    ) {
        super()
    }

    async isOnline(userId: string): Promise<boolean> {
        return this.online.isOnline(userId)
    }

    async lastSeenAt(userId: string): Promise<Date | null> {
        return this.store.lastSeenAt(userId)
    }

    async snapshot(userId: string): Promise<PresenceSnapshot> {
        const [online, lastSeenAt] = await Promise.all([this.online.isOnline(userId), this.store.lastSeenAt(userId)])
        return { online, lastSeenAt }
    }

    async snapshotOf(userIds: string[]): Promise<Map<string, PresenceSnapshot>> {
        const [online, lastSeen] = await Promise.all([this.online.onlineAmong(userIds), this.store.lastSeenOf(userIds)])
        return new Map(userIds.map((id) => [id, { online: online.has(id), lastSeenAt: lastSeen.get(id) ?? null }]))
    }
}
