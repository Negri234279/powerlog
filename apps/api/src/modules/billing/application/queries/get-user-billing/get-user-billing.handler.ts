import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { GetUserBillingQuery } from '../../../../../shared/contracts/get-user-billing.query'
import type { UserBillingSummary } from '../../../../../shared/contracts/user-billing'
import { monthlyAmountCents } from '../../../domain/plan-interval'
import { ENTITLING_STATUSES, type SubscriptionStatus } from '../../../domain/subscription-status'
import { AdminSubscriptionReadModel } from '../../ports/admin-subscription.read-model'
import { Clock } from '../../ports/clock.port'

/** A user never has many subscriptions; this is a safety cap, not real pagination. */
const MAX = 100

/**
 * Everything billing can tell an admin about one user: their subscriptions
 * (active and historical) and the recurring revenue they represent. Reuses the
 * admin subscription read model — the same rows the subscriptions table shows,
 * filtered to one user — so there is one source of truth for "what is billing
 * charging this person".
 */
@QueryHandler(GetUserBillingQuery)
export class GetUserBillingHandler implements IQueryHandler<GetUserBillingQuery, UserBillingSummary> {
    constructor(
        private readonly subscriptions: AdminSubscriptionReadModel,
        private readonly clock: Clock,
    ) {}

    async execute(query: GetUserBillingQuery): Promise<UserBillingSummary> {
        const page = await this.subscriptions.list({ userId: query.userId }, { limit: MAX, offset: 0 })
        const now = this.clock.now()

        const subscriptions = page.rows.map((row) => ({
            id: row.id,
            planId: row.planId,
            planSlug: row.planSlug,
            planName: row.planName,
            gateway: row.gateway,
            status: row.status,
            amountCents: row.amountCents,
            currency: row.currency,
            interval: row.interval,
            currentPeriodStart: row.currentPeriodStart,
            currentPeriodEnd: row.currentPeriodEnd,
            cancelAtPeriodEnd: row.cancelAtPeriodEnd,
            createdAt: row.createdAt,
        }))

        // MRR: monthly-normalised sum of the subscriptions that are entitling right
        // now and actually priced. A manual grant has no price and adds nothing; a
        // trial counts at its post-trial price. Currencies aren't mixed in practice
        // (a user is billed in one), so we report the first one seen.
        let mrrCents = 0
        let currency: string | null = null

        for (const row of page.rows) {
            if (!isEntitling(row.status, row.currentPeriodEnd, now)) continue
            if (row.amountCents === null || row.interval === null) continue

            mrrCents += monthlyAmountCents(row.amountCents, row.interval)
            currency ??= row.currency
        }

        return { subscriptions, mrrCents: Math.round(mrrCents), currency }
    }
}

/**
 * Does this subscription grant its plan right now? Mirrors
 * `SubscriptionAggregate.isEntitledAt`: the entitling statuses outright, plus a
 * canceled one whose paid period hasn't elapsed.
 */
function isEntitling(status: SubscriptionStatus, currentPeriodEnd: Date, now: Date): boolean {
    if (ENTITLING_STATUSES.includes(status)) return true

    return status === 'canceled' && now < currentPeriodEnd
}
