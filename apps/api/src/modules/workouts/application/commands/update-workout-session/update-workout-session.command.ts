export class UpdateWorkoutSessionCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        /** ISO 8601 datetime; absent = leave unchanged (can't be cleared). */
        public readonly performedAt?: string,
        /** Absent = leave unchanged; null = clear. */
        public readonly notes?: string | null,
    ) {}
}
