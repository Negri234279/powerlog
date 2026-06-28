import type { GoogleProfileSnapshot } from './google-profile-snapshot'

/**
 * Published on the CQRS EventBus when a brand-new account is created (via
 * password or Google). Lives in the shared kernel so any module can react
 * without importing another module. The profile module consumes it to create
 * the user's profile (seeding name/avatar from Google when present).
 */
export class UserRegisteredIntegrationEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly source: 'password' | 'google',
        public readonly google?: GoogleProfileSnapshot,
    ) {}
}
