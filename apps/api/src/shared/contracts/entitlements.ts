/**
 * Cross-cutting seam for subscription-plan limits. Feature handlers route every
 * limitable action through this port instead of hard-coding caps, so when paid
 * plans land only the implementation changes — never the call sites.
 *
 * The default implementation (`UnlimitedEntitlements`) allows everything; it is
 * replaced by a plan-aware adapter once subscriptions exist. Keep the surface
 * small and add methods as real limits appear.
 */
export abstract class Entitlements {
    /**
     * Assert the coach may take on one more athlete under their current plan.
     * `currentAthleteCount` is the number of athletes already linked. Throws a
     * domain error when the plan's cap would be exceeded.
     */
    abstract assertCanAddAthlete(coachId: string, currentAthleteCount: number): Promise<void>
}
