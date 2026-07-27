/** Whether this connect was the user's first live connection (0 → 1). */
export interface ConnectResult {
    firstConnection: boolean
}

/** Whether this disconnect dropped the user's last live connection (1 → 0). */
export interface DisconnectResult {
    lastDisconnection: boolean
}

/**
 * Live "who is connected right now" state, ref-counted per user (a user can have
 * several tabs/sockets). Single-process in memory; across processes a Redis
 * counter answers "online in ANY process" — same `REDIS_URL` switch as the rest
 * of the app. The `firstConnection`/`lastDisconnection` flags are what let the
 * service emit online/offline transitions exactly once, not per socket.
 */
export abstract class OnlineRegistry {
    abstract connect(userId: string): Promise<ConnectResult>
    abstract disconnect(userId: string): Promise<DisconnectResult>
    /** Keep a still-connected user's liveness fresh (Redis TTL). No-op in memory. */
    abstract refresh(userId: string): Promise<void>
    abstract isOnline(userId: string): Promise<boolean>
    /** The subset of `userIds` currently online (one round-trip). */
    abstract onlineAmong(userIds: string[]): Promise<Set<string>>
}
