import type { SubscriptionAggregate } from '../../../src/modules/billing/domain/entities/subscription.entity'
import { SubscriptionRepository } from '../../../src/modules/billing/domain/repositories/subscription.repository'
import { LIVE_STATUSES } from '../../../src/modules/billing/domain/subscription-status'

/** In-memory SubscriptionRepository implementing the real port. */
export class InMemorySubscriptionRepository extends SubscriptionRepository {
    private readonly byId = new Map<string, SubscriptionAggregate>()

    constructor(seed: SubscriptionAggregate[] = []) {
        super()
        for (const subscription of seed) this.byId.set(subscription.id, subscription)
    }

    async save(subscription: SubscriptionAggregate): Promise<void> {
        this.byId.set(subscription.id, subscription)
    }

    async findById(id: string): Promise<SubscriptionAggregate | null> {
        return this.byId.get(id) ?? null
    }

    async findLiveByUser(userId: string): Promise<SubscriptionAggregate | null> {
        for (const subscription of this.byId.values()) {
            if (subscription.userId === userId && LIVE_STATUSES.includes(subscription.status)) return subscription
        }

        return null
    }

    all(): SubscriptionAggregate[] {
        return [...this.byId.values()]
    }
}
