/**
 * Published on the CQRS EventBus when a user soft-deletes their account (GDPR).
 * Lives in the shared kernel so any module can react to scrub the personal data
 * it owns (e.g. the profile module deletes the profile + avatar) without
 * importing the auth module.
 */
export class UserDeletedIntegrationEvent {
    constructor(public readonly userId: string) {}
}
