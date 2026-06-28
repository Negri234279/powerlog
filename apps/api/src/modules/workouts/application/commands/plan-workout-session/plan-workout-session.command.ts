/** A coach plans a session for one of their athletes (status: planned). */
export class PlanWorkoutSessionCommand {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
        /** ISO 8601 datetime; defaults to "now" when omitted. */
        public readonly performedAt?: string | null,
        public readonly notes?: string | null,
    ) {}
}
