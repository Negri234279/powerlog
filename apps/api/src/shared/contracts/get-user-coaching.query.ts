/**
 * Synchronous request (QueryBus) for a user's coaching relationships — who
 * coaches them, and who they coach. Lives in the shared kernel so the auth-side
 * admin detail can dispatch it and the coaching module can handle it without a
 * cross-module import.
 */
export class GetUserCoachingQuery {
    constructor(public readonly userId: string) {}
}
