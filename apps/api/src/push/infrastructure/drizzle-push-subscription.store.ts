import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../database/database.module'
import { PushSubscriptionStore } from '../push-subscription-store'
import type { PushSubscriptionInput, StoredPushSubscription } from '../push.types'
import { pushSubscriptions } from './schema/push-subscription.schema'

@Injectable()
export class DrizzlePushSubscriptionStore extends PushSubscriptionStore {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async save(subscription: PushSubscriptionInput): Promise<void> {
        const now = new Date()

        await this.db
            .insert(pushSubscriptions)
            .values({
                userId: subscription.userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.p256dh,
                auth: subscription.auth,
                locale: subscription.locale,
                userAgent: subscription.userAgent ?? null,
                lastSeenAt: now,
            })
            // The endpoint is the browser's identity for this subscription; a
            // re-register reassigns it to whoever is signed in now and refreshes
            // its keys/locale/last-seen.
            .onConflictDoUpdate({
                target: pushSubscriptions.endpoint,
                set: {
                    userId: subscription.userId,
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                    locale: subscription.locale,
                    userAgent: subscription.userAgent ?? null,
                    lastSeenAt: now,
                },
            })
    }

    async removeByEndpoint(userId: string, endpoint: string): Promise<boolean> {
        const deleted = await this.db
            .delete(pushSubscriptions)
            .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
            .returning({ id: pushSubscriptions.id })

        return deleted.length > 0
    }

    async findByUsers(userIds: readonly string[]): Promise<StoredPushSubscription[]> {
        if (userIds.length === 0) return []

        const rows = await this.db
            .select({
                userId: pushSubscriptions.userId,
                endpoint: pushSubscriptions.endpoint,
                p256dh: pushSubscriptions.p256dh,
                auth: pushSubscriptions.auth,
                locale: pushSubscriptions.locale,
            })
            .from(pushSubscriptions)
            .where(inArray(pushSubscriptions.userId, [...userIds]))

        return rows
    }

    async deleteByEndpoint(endpoint: string): Promise<void> {
        await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
    }

    async count(): Promise<number> {
        const [row] = await this.db.select({ count: sql<number>`count(*)::int` }).from(pushSubscriptions)

        return row?.count ?? 0
    }
}
