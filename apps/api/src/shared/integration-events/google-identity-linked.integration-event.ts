import type { GoogleProfileSnapshot } from './google-profile-snapshot'

/**
 * Published when a Google identity is linked to an EXISTING account (the user
 * registered with a password, then signed in with Google on the same email).
 * The profile module uses it to backfill empty name fields and, later, the
 * avatar from Google.
 */
export class GoogleIdentityLinkedIntegrationEvent {
    constructor(
        public readonly userId: string,
        public readonly google: GoogleProfileSnapshot,
    ) {}
}
