/** The proposal awaiting a decision on this session, if there is one. */
export class GetSessionPlanDraftQuery {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
    ) {}
}
