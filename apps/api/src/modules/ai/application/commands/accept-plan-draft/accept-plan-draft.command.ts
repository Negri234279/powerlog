/** Write an open draft's targets onto its session. */
export class AcceptPlanDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
    ) {}
}
