/** A user's presence at a moment: live online flag + durable last-seen. */
export interface PresenceSnapshot {
    online: boolean
    /** Null if the user has never opened the realtime socket. */
    lastSeenAt: Date | null
}

/**
 * Read-side port for presence, consumed cross-module (chat's conversation header
 * and `auth`'s admin read-model), the same shape as `CoachLinks`/`UserDirectory`.
 * `online` is live state; `lastSeenAt` is durable — a reader composes both.
 */
export abstract class PresenceReader {
    abstract isOnline(userId: string): Promise<boolean>
    abstract lastSeenAt(userId: string): Promise<Date | null>
    abstract snapshot(userId: string): Promise<PresenceSnapshot>
    /** Bulk snapshot for a roster/inbox — one online round-trip + one store read. */
    abstract snapshotOf(userIds: string[]): Promise<Map<string, PresenceSnapshot>>
}
