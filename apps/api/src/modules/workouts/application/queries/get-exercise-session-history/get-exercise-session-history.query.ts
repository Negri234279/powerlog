/** The caller's recent completed sessions logging one exercise, with their sets. */
export class GetExerciseSessionHistoryQuery {
    constructor(
        public readonly userId: string,
        public readonly exerciseId: string,
        public readonly excludeSessionId?: string | null,
        public readonly limit?: number | null,
    ) {}
}
