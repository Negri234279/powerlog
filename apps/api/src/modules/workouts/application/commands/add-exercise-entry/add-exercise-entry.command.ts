export class AddExerciseEntryCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly exerciseId: string,
        public readonly notes?: string | null,
    ) {}
}
