import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { SubscriptionAggregate } from '../../../domain/entities/subscription.entity'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import { LIVE_STATUSES } from '../../../domain/subscription-status'
import { toSubscriptionAggregate, toSubscriptionRow } from '../mappers/subscription.mapper'
import { subscriptions } from '../schema/subscriptions.schema'

@Injectable()
export class DrizzleSubscriptionRepository extends SubscriptionRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async save(subscription: SubscriptionAggregate): Promise<void> {
        const row = toSubscriptionRow(subscription)

        await this.db
            .insert(subscriptions)
            .values(row)
            .onConflictDoUpdate({
                target: subscriptions.id,
                set: {
                    planId: row.planId,
                    planPriceId: row.planPriceId,
                    gatewayCustomerId: row.gatewayCustomerId,
                    gatewaySubscriptionId: row.gatewaySubscriptionId,
                    status: row.status,
                    currentPeriodStart: row.currentPeriodStart,
                    currentPeriodEnd: row.currentPeriodEnd,
                    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
                    canceledAt: row.canceledAt,
                    pendingPlanPriceId: row.pendingPlanPriceId,
                    updatedAt: row.updatedAt,
                },
            })
    }

    async findLiveByUser(userId: string): Promise<SubscriptionAggregate | null> {
        const [row] = await this.db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, [...LIVE_STATUSES])))
            .limit(1)

        return row ? toSubscriptionAggregate(row) : null
    }
}
