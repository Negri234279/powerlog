export class CreateWorkoutSessionCommand {
    constructor(
        public readonly userId: string,
        /** ISO 8601 datetime; defaults to "now" when omitted. */
        public readonly performedAt?: string | null,
        public readonly notes?: string | null,
    ) {}
}
