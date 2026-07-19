/**
 * Synchronous request (QueryBus) for a user's billing summary — every
 * subscription they hold plus the MRR they add up to. Lives in the shared kernel
 * so the auth-side admin detail can dispatch it and the billing module can handle
 * it without a cross-module import, the same seam as {@link GetPlanMembershipQuery}.
 */
export class GetUserBillingQuery {
    constructor(public readonly userId: string) {}
}
