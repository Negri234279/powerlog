import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import type { PaymentGateway, SubscriptionAggregate } from '../entities/subscription.entity'

/** Persistence port for subscriptions. */
export abstract class SubscriptionRepository {
    abstract save(subscription: SubscriptionAggregate): Promise<void>

    abstract findById(id: string): Promise<SubscriptionAggregate | null>

    /**
     * The user's live subscription (any of `LIVE_STATUSES`), or null. At most one
     * exists — the partial unique index sees to that — so a canceled-but-unexpired
     * one still holds the slot, and the user cannot stack a second one on top of
     * time they already paid for.
     *
     * "Live" is not the same as "entitling": whether it actually grants the plan
     * is `SubscriptionAggregate.isEntitledAt`, which a canceled row fails once its
     * period has elapsed.
     */
    abstract findLiveByUser(userId: string): Promise<SubscriptionAggregate | null>

    /**
     * Every live subscription of the user — athlete and coach plans are
     * independent, so a coach may hold one of each. The partial unique index
     * bounds this at one per audience; the same not-stacking rule as
     * {@link findLiveByUser} applies within each.
     */
    abstract findAllLiveByUser(userId: string): Promise<SubscriptionAggregate[]>

    /**
     * The user's live subscription in one audience, or null. At most one exists
     * (the partial unique index is on `(user, audience)`), so this is how the
     * per-audience actions — checkout, change, cancel — find the row they operate
     * on without touching the user's plan in the other audience.
     */
    abstract findLiveByUserAndAudience(userId: string, audience: PlanAudience): Promise<SubscriptionAggregate | null>

    /** The local mirror of a gateway subscription — how a webhook finds its row. */
    abstract findByGatewayId(gatewaySubscriptionId: string): Promise<SubscriptionAggregate | null>

    /** Everything we believe is live on a gateway. The reconciliation's local side. */
    abstract findLiveByGateway(gateway: PaymentGateway): Promise<SubscriptionAggregate[]>
}
