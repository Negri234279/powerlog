/** Ask the model to revise an open draft ("more volume on bench", "I'm beat"). */
export class RefinePlanDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
        public readonly message: string,
    ) {}
}
