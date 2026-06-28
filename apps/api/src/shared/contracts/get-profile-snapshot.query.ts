/**
 * Synchronous request (QueryBus) for a user's profile snapshot (handle +
 * avatar). Lives in the shared kernel so the auth-side adapter can dispatch it
 * and the profile module can handle it without a cross-module import. Returns a
 * `ProfileSnapshot | null` (null when the user has no profile yet).
 */
export class GetProfileSnapshotQuery {
    constructor(public readonly userId: string) {}
}
