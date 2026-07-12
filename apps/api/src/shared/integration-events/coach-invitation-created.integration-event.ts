/**
 * Published on the CQRS EventBus when a coach invites an athlete (by email).
 * Lives in the shared kernel so the notifications module can react without
 * importing the coaching module. Coaching publishes it; notifications consumes it
 * to drop a bell entry + email into a registered athlete's inbox, or to send an
 * email-only signup invite when the address has no account yet.
 */
export class CoachInvitationCreatedIntegrationEvent {
    constructor(
        public readonly invitationId: string,
        public readonly coachId: string,
        /** The invited athlete's user id, or null if the email has no account yet. */
        public readonly athleteId: string | null,
        /** The email the invitation was addressed to (normalized lowercase). */
        public readonly email: string,
        /** Coach's public handle, for the notification/email copy. */
        public readonly coachUsername: string,
        /** Opaque signup-link token, for the not-yet-registered email path. */
        public readonly token: string,
    ) {}
}
