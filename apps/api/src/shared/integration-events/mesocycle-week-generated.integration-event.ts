/**
 * Published on the CQRS EventBus when a coach materializes one week of an
 * athlete's training block into planned sessions. Lives in the shared kernel so
 * realtime (and, later, notifications) can react without importing workouts.
 *
 * One event for the whole week, not one per session: generating a week drops four
 * to six sessions into the athlete's log at once, and treating each as its own
 * announcement would bury them under their own noise.
 *
 * Only raised for a block the athlete owns and the coach plans — an athlete
 * generating their own week already knows.
 */
export class MesocycleWeekGeneratedIntegrationEvent {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
        public readonly mesocycleId: string,
        /** 1-based week within the block. */
        public readonly week: number,
        /** How many sessions landed in the athlete's log. */
        public readonly sessions: number,
    ) {}
}
