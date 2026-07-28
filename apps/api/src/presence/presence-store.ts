/**
 * Durable "last seen" persistence for presence. Separate from live online state
 * (see `OnlineRegistry`): this survives restarts and is what the admin panel
 * falls back to for a user who isn't connected right now.
 */
export abstract class PresenceStore {
    /** Record that `userId` was seen at `at` (upsert the single row). */
    abstract touch(userId: string, at: Date): Promise<void>
    /** The user's last-seen timestamp, or null if they never opened the socket. */
    abstract lastSeenAt(userId: string): Promise<Date | null>
    /** Bulk variant: only users with a row appear in the map. */
    abstract lastSeenOf(userIds: string[]): Promise<Map<string, Date>>
}
