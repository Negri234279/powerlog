/**
 * A user's subscription moved. Published by billing whenever the gateway tells us
 * something changed, and consumed by everyone who has to react without importing
 * billing: notifications (the bell), realtime (the tab refreshes itself) and the
 * entitlements cache (it has to forget what it knew about this user).
 *
 * `reason` is what actually happened, so a consumer can tell "you're in" from
 * "your card failed" without re-deriving it from the status.
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
        readonly reason: SubscriptionChangeReason,
        /** When the access they have paid for runs out. */
        readonly currentPeriodEnd: Date,
    ) {}
}
