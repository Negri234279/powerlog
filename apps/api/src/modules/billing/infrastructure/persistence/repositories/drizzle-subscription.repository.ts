import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'

import type { PlanAudience } from '../../../../../shared/contracts/entitlements'
import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { SubscriptionAggregate } from '../../../domain/entities/subscription.entity'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import { ENTITLING_STATUSES, LIVE_STATUSES } from '../../../domain/subscription-status'
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

    async findByGatewayId(gatewaySubscriptionId: string): Promise<SubscriptionAggregate | null> {
        const [row] = await this.db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.gatewaySubscriptionId, gatewaySubscriptionId))
            .limit(1)

        return row ? toSubscriptionAggregate(row) : null
    }

    async findLiveByGateway(gateway: PaymentGateway): Promise<SubscriptionAggregate[]> {
        const rows = await this.db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.gateway, gateway), inArray(subscriptions.status, [...ENTITLING_STATUSES])))

        return rows.map(toSubscriptionAggregate)
    }

    async findById(id: string): Promise<SubscriptionAggregate | null> {
        const [row] = await this.db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1)

        return row ? toSubscriptionAggregate(row) : null
    }

    async findLiveByUser(userId: string): Promise<SubscriptionAggregate | null> {
        const [row] = await this.db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, [...LIVE_STATUSES])))
            .limit(1)

        return row ? toSubscriptionAggregate(row) : null
    }

    async findAllLiveByUser(userId: string): Promise<SubscriptionAggregate[]> {
        const rows = await this.db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, [...LIVE_STATUSES])))

        return rows.map(toSubscriptionAggregate)
    }

    async findLiveByUserAndAudience(userId: string, audience: PlanAudience): Promise<SubscriptionAggregate | null> {
        const [row] = await this.db
            .select()
            .from(subscriptions)
            .where(
                and(
                    eq(subscriptions.userId, userId),
                    eq(subscriptions.audience, audience),
                    inArray(subscriptions.status, [...LIVE_STATUSES]),
                ),
            )
            .limit(1)

        return row ? toSubscriptionAggregate(row) : null
    }
}
