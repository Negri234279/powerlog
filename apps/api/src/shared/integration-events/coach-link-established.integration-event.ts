/**
 * Published on the CQRS EventBus when a coach↔athlete link is established —
 * either the athlete accepted an invitation, or a not-yet-registered invitee
 * signed up and was auto-linked. Lives in the shared kernel so notifications can
 * react (bell + email to both parties) without importing the coaching module.
 */
export class CoachLinkEstablishedIntegrationEvent {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
        /** Coach's public handle, for the notification copy. */
        public readonly coachUsername: string,
        /** Athlete's public handle, for the notification copy. */
        public readonly athleteUsername: string,
    ) {}
}
