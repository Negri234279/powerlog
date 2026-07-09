/**
 * Synchronous request (QueryBus) for the context needed to program a planned
 * session. Lives in the shared kernel so the AI-side adapter can dispatch it and
 * the workouts module can handle it without a cross-module import. Returns a
 * `SessionPlanContext | null`.
 */
export class GetSessionPlanContextQuery {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        /** How many past sessions of each exercise to include. */
        public readonly historyLimit: number,
    ) {}
}
