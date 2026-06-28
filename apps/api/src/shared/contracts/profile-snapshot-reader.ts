/**
 * Cross-module read contract: lets auth fetch the public profile fields it
 * stamps into the access JWT (handle + avatar) without importing the profile
 * module. The implementation dispatches a `GetProfileSnapshotQuery` over the
 * QueryBus (global via `CqrsModule.forRoot`), so auth and profile stay
 * decoupled — the read-side mirror of `ProfileProvisioner`. Lives in the shared
 * kernel so neither side crosses a module boundary.
 */
export interface ProfileSnapshot {
    /** The user's public handle (the profile display name). */
    username: string
    /** Resolved avatar URL; null → client shows the default. */
    avatarUrl: string | null
}

export abstract class ProfileSnapshotReader {
    /** Read a user's profile snapshot, or null if no profile exists yet. */
    abstract read(userId: string): Promise<ProfileSnapshot | null>
}
