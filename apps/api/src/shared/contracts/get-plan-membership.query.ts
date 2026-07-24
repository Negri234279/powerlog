/**
 * Cross-module query: who is on these plans, right now?
 *
 * Handled by the billing module (it owns plans and subscriptions) and dispatched
 * over the QueryBus by `PlanAwarePlanDirectory`, so the caller never imports
 * billing — same pattern as {@link GetUserEntitlementsQuery}.
 *
 * It applies the same fallback rule as the entitlements query, from the other
 * end: a user with nothing entitling is on the free plan of their audience.
 */
export class GetPlanMembershipQuery {
    constructor(readonly planSlugs: string[]) {}
}
