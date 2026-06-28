/**
 * Published on the CQRS EventBus when a coach invites an athlete. Lives in the
 * shared kernel so the notifications module can react without importing the
 * coaching module. Coaching (Bloque 5.8) publishes it; notifications consumes it
 * to drop a bell entry + email into the athlete's inbox.
 */
export class CoachInvitationCreatedIntegrationEvent {
    constructor(
        public readonly invitationId: string,
        public readonly coachId: string,
        public readonly athleteId: string,
        /** Coach's public handle, for the notification/email copy. */
        public readonly coachUsername: string,
    ) {}
}
