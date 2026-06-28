/** A coach plans a session for an athlete, pre-filled from one of the coach's templates. */
export class PlanSessionFromTemplateCommand {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
        public readonly templateId: string,
        /** ISO 8601 datetime; defaults to "now" when omitted. */
        public readonly performedAt?: string | null,
        public readonly notes?: string | null,
    ) {}
}
