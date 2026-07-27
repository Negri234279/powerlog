import { PresenceReader, type PresenceSnapshot } from '../../../src/presence/presence-reader'

/**
 * In-memory PresenceReader double. Seed snapshots per user; anyone unseeded
 * reads as offline with no last-seen (the pre-presence-deploy default).
 */
export class FakePresenceReader extends PresenceReader {
    private readonly snapshots = new Map<string, PresenceSnapshot>()

    set(userId: string, snapshot: PresenceSnapshot): this {
        this.snapshots.set(userId, snapshot)
        return this
    }

    private snap(userId: string): PresenceSnapshot {
        return this.snapshots.get(userId) ?? { online: false, lastSeenAt: null }
    }

    async isOnline(userId: string): Promise<boolean> {
        return this.snap(userId).online
    }

    async lastSeenAt(userId: string): Promise<Date | null> {
        return this.snap(userId).lastSeenAt
    }

    async snapshot(userId: string): Promise<PresenceSnapshot> {
        return this.snap(userId)
    }

    async snapshotOf(userIds: string[]): Promise<Map<string, PresenceSnapshot>> {
        return new Map(userIds.map((id) => [id, this.snap(id)]))
    }
}
