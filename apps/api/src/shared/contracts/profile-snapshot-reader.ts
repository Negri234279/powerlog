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
    /** Given name, if they filled it in; null otherwise. */
    firstName: string | null
    /** Family name, if they filled it in; null otherwise. */
    lastName: string | null
    /** Resolved avatar URL; null → client shows the default. */
    avatarUrl: string | null
    /** The user's preferred locale (BCP-47, e.g. "es-ES"); null → not set. */
    locale: string | null
}

export abstract class ProfileSnapshotReader {
    /** Read a user's profile snapshot, or null if no profile exists yet. */
    abstract read(userId: string): Promise<ProfileSnapshot | null>
}
