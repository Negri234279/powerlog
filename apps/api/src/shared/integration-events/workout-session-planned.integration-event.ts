/**
 * Published on the CQRS EventBus when a coach plans a session for one of their
 * athletes (from scratch or from a template). Lives in the shared kernel so
 * notifications can bell the athlete without importing the workouts module.
 *
 * Carries ids only: workouts has no business knowing about handles, so the
 * notification side resolves the coach's username through the `UserDirectory`.
 */
export class WorkoutSessionPlannedIntegrationEvent {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
        public readonly sessionId: string,
        public readonly performedAt: Date,
    ) {}
}
