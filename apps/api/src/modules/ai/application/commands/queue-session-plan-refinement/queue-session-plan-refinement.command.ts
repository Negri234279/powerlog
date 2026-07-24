/** Ask for an open session-plan draft to be revised ("less volume, I'm beat"). */
export class QueueSessionPlanRefinementCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
        public readonly message: string,
    ) {}
}
