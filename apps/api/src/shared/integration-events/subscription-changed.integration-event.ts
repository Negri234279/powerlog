import type { PlanAudience } from '../contracts/entitlements'

/**
 * A user's subscription moved. Published by billing whenever the gateway tells us
 * something changed, and consumed by everyone who has to react without importing
 * billing: notifications (the bell), realtime (the tab refreshes itself), the
 * entitlements cache (it has to forget what it knew about this user) and auth (an
 * athlete who buys a coach plan is promoted to coach when it activates).
 *
 * `reason` is what actually happened, so a consumer can tell "you're in" from
 * "your card failed" without re-deriving it from the status. `audience` is the
 * plan's audience, so the coach-promotion consumer can react without importing
 * billing or mapping slugs to audiences.
 */
export type SubscriptionChangeReason =
    | 'activated'
    | 'renewed'
    | 'plan_changed'
    | 'canceled'
    | 'resumed'
    | 'payment_failed'
    | 'expired'

export class SubscriptionChangedIntegrationEvent {
    constructor(
        readonly userId: string,
        readonly subscriptionId: string,
        /** The plan's slug — bounded, and enough for the copy of a notification. */
        readonly planSlug: string,
        /** The plan's audience — who the plan is for (athlete or coach). */
        readonly audience: PlanAudience,
        readonly reason: SubscriptionChangeReason,
        /** When the access they have paid for runs out. */
        readonly currentPeriodEnd: Date,
    ) {}
}
