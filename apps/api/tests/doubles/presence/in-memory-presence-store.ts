import { PresenceStore } from '../../../src/presence/presence-store'

/** In-memory PresenceStore implementing the real abstract interface. */
export class InMemoryPresenceStore extends PresenceStore {
    readonly seen = new Map<string, Date>()

    async touch(userId: string, at: Date): Promise<void> {
        this.seen.set(userId, at)
    }

    async lastSeenAt(userId: string): Promise<Date | null> {
        return this.seen.get(userId) ?? null
    }

    async lastSeenOf(userIds: string[]): Promise<Map<string, Date>> {
        return new Map(userIds.filter((id) => this.seen.has(id)).map((id) => [id, this.seen.get(id)!]))
    }
}
