export class RemoveExerciseEntryCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly entryId: string,
    ) {}
}
