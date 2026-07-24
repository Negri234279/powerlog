import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gt, inArray, or } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type EntitledSubscriberRow,
    PlanMembershipReadModel,
} from '../../../application/ports/plan-membership.read-model'
import { ENTITLING_STATUSES } from '../../../domain/subscription-status'
import { plans } from '../schema/plans.schema'
import { subscriptions } from '../schema/subscriptions.schema'

/**
 * The entitled-subscriber set. Joins only billing's own tables — the caller
 * matches these ids against its own, because the users table belongs to auth.
 *
 * The `where` mirrors `SubscriptionAggregate.isEntitledAt` in SQL. That is a
 * duplicated rule, and the reason it's tolerable here is that rehydrating every
 * subscription to ask the aggregate would defeat the point of a set-shaped
 * answer. If the rule ever moves, `plan-membership.handler.spec.ts` covers the
 * canceled-but-unexpired and incomplete cases that make the two disagree.
 */
@Injectable()
export class DrizzlePlanMembershipReadModel extends PlanMembershipReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async entitledSubscribers(now: Date): Promise<EntitledSubscriberRow[]> {
        return this.db
            .select({
                userId: subscriptions.userId,
                planSlug: plans.slug,
            })
            .from(subscriptions)
            .innerJoin(plans, eq(plans.id, subscriptions.planId))
            .where(
                or(
                    inArray(subscriptions.status, [...ENTITLING_STATUSES]),
                    and(eq(subscriptions.status, 'canceled'), gt(subscriptions.currentPeriodEnd, now)),
                ),
            )
    }
}
