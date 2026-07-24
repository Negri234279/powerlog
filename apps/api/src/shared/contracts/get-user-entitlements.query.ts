/**
 * Cross-module query: what is this user entitled to, right now?
 *
 * Handled by the billing module (it owns plans and subscriptions) and dispatched
 * over the QueryBus by `PlanAwareEntitlements`, so the entitlements seam never
 * imports billing. Same pattern as the planning readers in `src/planning/`.
 *
 * Answering it never fails for a user without a subscription: they fall back to
 * the free plan of their audience.
 */
export class GetUserEntitlementsQuery {
    constructor(readonly userId: string) {}
}
