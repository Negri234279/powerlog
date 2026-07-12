/** Who ended the coaching relationship. */
export type UnlinkedBy = 'coach' | 'athlete'

/**
 * Published on the CQRS EventBus when a coach↔athlete link is broken — the coach
 * removed the athlete, or the athlete left the coach. Lives in the shared kernel
 * so notifications can react (tell the other party) without importing the
 * coaching module.
 *
 * The athlete keeps everything already planned for them; the coach simply loses
 * access (every read/write re-checks the link).
 */
export class CoachLinkRemovedIntegrationEvent {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
        public readonly coachUsername: string,
        public readonly athleteUsername: string,
        public readonly unlinkedBy: UnlinkedBy,
    ) {}
}
