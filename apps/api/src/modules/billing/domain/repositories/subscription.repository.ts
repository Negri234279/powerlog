import type { SubscriptionAggregate } from '../entities/subscription.entity'

/** Persistence port for subscriptions. */
export abstract class SubscriptionRepository {
    abstract save(subscription: SubscriptionAggregate): Promise<void>

    /**
     * The user's live subscription (any of `LIVE_STATUSES`), or null. At most one
     * exists — the partial unique index sees to that — so a canceled-but-unexpired
     * one still holds the slot, and the user cannot stack a second on top of time
     * they already paid for.
     *
     * "Live" is not the same as "entitling": whether it actually grants the plan
     * is `SubscriptionAggregate.isEntitledAt`, which a canceled row fails once its
     * period has elapsed.
     */
    abstract findLiveByUser(userId: string): Promise<SubscriptionAggregate | null>
}
