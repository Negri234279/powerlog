/**
 * One session draft by id, whatever its status — the history's detail view.
 * `GetSessionPlanDraftQuery` answers a different question: the *open* draft on a
 * session, which is what the session screen's panel needs.
 */
export class GetPlanDraftQuery {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
    ) {}
}
