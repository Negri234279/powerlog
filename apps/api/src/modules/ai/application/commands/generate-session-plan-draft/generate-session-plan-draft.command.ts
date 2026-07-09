/** Ask the default provider to program a planned session. */
export class GenerateSessionPlanDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
    ) {}
}
