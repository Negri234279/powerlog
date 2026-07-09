/** Throw away an open draft without touching the session. */
export class DiscardPlanDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
    ) {}
}
