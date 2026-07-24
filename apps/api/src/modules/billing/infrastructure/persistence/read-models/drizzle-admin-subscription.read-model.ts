import { Inject, Injectable } from '@nestjs/common'
import { and, count, desc, eq, inArray } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type AdminSubscriptionFilter,
    type AdminSubscriptionPage,
    AdminSubscriptionReadModel,
    type AdminSubscriptionRow,
} from '../../../application/ports/admin-subscription.read-model'
import { planPrices } from '../schema/plan-prices.schema'
import { plans } from '../schema/plans.schema'
import { subscriptions } from '../schema/subscriptions.schema'

/**
 * The admin subscription list. Joins only billing's own tables — who the
 * subscriber is gets resolved by the handler through the `UserDirectory`, because
 * the users table belongs to auth.
 *
 * The price is a LEFT join: a manual grant has none, and it still has to show up.
 */
@Injectable()
export class DrizzleAdminSubscriptionReadModel extends AdminSubscriptionReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async list(
        filter: AdminSubscriptionFilter,
        page: { limit: number; offset: number },
    ): Promise<AdminSubscriptionPage> {
        const where = and(
            filter.statuses && filter.statuses.length > 0 ? inArray(subscriptions.status, filter.statuses) : undefined,
            filter.gateways && filter.gateways.length > 0 ? inArray(subscriptions.gateway, filter.gateways) : undefined,
            filter.planId ? eq(subscriptions.planId, filter.planId) : undefined,
            filter.userId ? eq(subscriptions.userId, filter.userId) : undefined,
        )

        const rows = await this.db
            .select({
                id: subscriptions.id,
                userId: subscriptions.userId,
                planId: subscriptions.planId,
                planSlug: plans.slug,
                planName: plans.name,
                gateway: subscriptions.gateway,
                status: subscriptions.status,
                amountCents: planPrices.amountCents,
                currency: planPrices.currency,
                interval: planPrices.interval,
                currentPeriodStart: subscriptions.currentPeriodStart,
                currentPeriodEnd: subscriptions.currentPeriodEnd,
                cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
                createdAt: subscriptions.createdAt,
            })
            .from(subscriptions)
            .innerJoin(plans, eq(plans.id, subscriptions.planId))
            .leftJoin(planPrices, eq(planPrices.id, subscriptions.planPriceId))
            .where(where)
            .orderBy(desc(subscriptions.createdAt))
            .limit(page.limit)
            .offset(page.offset)

        const [total] = await this.db.select({ value: count() }).from(subscriptions).where(where)

        return {
            rows: rows as AdminSubscriptionRow[],
            total: Number(total?.value ?? 0),
        }
    }
}
