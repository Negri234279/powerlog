/** A user whose subscription entitles them, and the plan it points at. */
export interface EntitledSubscriberRow {
    userId: string
    planSlug: string
}

/**
 * Reads who is currently entitled by a subscription. Deliberately a read model
 * and not `SubscriptionRepository`: this asks about the whole table at once and
 * needs the plan's slug joined in, which is a listing question, not an aggregate
 * one — rehydrating every subscription to answer it would be absurd.
 *
 * "Entitled" is the SQL twin of `SubscriptionAggregate.isEntitledAt`: an
 * entitling status, or `canceled` with time still left on the period. Note what
 * it excludes — an `incomplete` subscription is live (it holds the one-per-user
 * slot) but grants nothing, so its owner is still on the free plan.
 */
export abstract class PlanMembershipReadModel {
    abstract entitledSubscribers(now: Date): Promise<EntitledSubscriberRow[]>
}
