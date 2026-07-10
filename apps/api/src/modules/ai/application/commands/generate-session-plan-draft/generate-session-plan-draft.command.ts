/** Ask the default provider to program a planned session, or one exercise of it. */
export class GenerateSessionPlanDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        /** Program only this exercise entry; null takes the whole session. */
        public readonly entryId: string | null = null,
        /** Anything the athlete wants the model to know ("shoulder is sore"). */
        public readonly extraInfo: string | null = null,
    ) {}
}
