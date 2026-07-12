/**
 * Published on the CQRS EventBus when a coach gives an athlete a training block —
 * either built for them or copied from the coach's library. Lives in the shared
 * kernel so notifications can bell the athlete without importing workouts.
 *
 * Carries ids + the block name; the notification side resolves the coach's
 * username through the `UserDirectory`.
 */
export class MesocycleAssignedIntegrationEvent {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
        public readonly mesocycleId: string,
        public readonly name: string,
    ) {}
}
