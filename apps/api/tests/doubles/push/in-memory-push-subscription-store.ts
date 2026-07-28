import { PushSubscriptionStore } from '../../../src/push/push-subscription-store'
import type { PushSubscriptionInput, StoredPushSubscription } from '../../../src/push/push.types'

interface Row extends StoredPushSubscription {
    userAgent: string | null
}

/** In-memory PushSubscriptionStore implementing the real abstract interface,
 *  keyed by endpoint (the store's uniqueness rule). */
export class InMemoryPushSubscriptionStore extends PushSubscriptionStore {
    readonly rows = new Map<string, Row>()

    async save(subscription: PushSubscriptionInput): Promise<void> {
        this.rows.set(subscription.endpoint, {
            userId: subscription.userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
            locale: subscription.locale,
            userAgent: subscription.userAgent ?? null,
        })
    }

    async removeByEndpoint(userId: string, endpoint: string): Promise<boolean> {
        const row = this.rows.get(endpoint)
        if (!row || row.userId !== userId) return false

        this.rows.delete(endpoint)

        return true
    }

    async findByUsers(userIds: readonly string[]): Promise<StoredPushSubscription[]> {
        const wanted = new Set(userIds)
        return [...this.rows.values()].filter((row) => wanted.has(row.userId))
    }

    async deleteByEndpoint(endpoint: string): Promise<void> {
        this.rows.delete(endpoint)
    }

    async count(): Promise<number> {
        return this.rows.size
    }
}
