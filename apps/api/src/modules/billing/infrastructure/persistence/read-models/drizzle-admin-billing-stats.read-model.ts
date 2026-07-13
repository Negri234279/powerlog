import { Inject, Injectable } from '@nestjs/common'
import { sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type AdminBillingStats,
    AdminBillingStatsReadModel,
    type MrrByPlan,
    type SubscriptionsByPlan,
    type SubscriptionsByStatus,
} from '../../../application/ports/admin-billing-stats.read-model'

/**
 * The figures behind the admin billing panel **and** the Prometheus state gauges.
 * One read model for both, on purpose (the coaching pattern): two queries would
 * eventually disagree, and a dashboard that contradicts Grafana is worse than one
 * that is a few seconds stale.
 *
 * "Entitling" here means the same thing it means everywhere else — the statuses
 * that grant the plan (`trialing | active | past_due`), plus a cancelled
 * subscription whose paid period has not run out yet. Anything else is history.
 */
@Injectable()
export class DrizzleAdminBillingStatsReadModel extends AdminBillingStatsReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async read(): Promise<AdminBillingStats> {
        const entitling = sql`(
            s.status IN ('trialing', 'active', 'past_due')
            OR (s.status = 'canceled' AND s.current_period_end > now())
        )`

        const byStatus = await this.db.execute<{ status: string; gateway: string; count: string }>(sql`
            SELECT s.status::text AS status, s.gateway::text AS gateway, count(*)::text AS count
            FROM subscriptions s
            WHERE ${entitling}
            GROUP BY s.status, s.gateway
        `)

        const byPlan = await this.db.execute<{ plan: string; audience: string; count: string }>(sql`
            SELECT p.slug AS plan, p.audience::text AS audience, count(*)::text AS count
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            WHERE ${entitling}
            GROUP BY p.slug, p.audience
            ORDER BY count(*) DESC
        `)

        // MRR counts what is actually being billed: trials pay nothing yet, and a
        // manual grant has no price at all (it joins to nothing). Each amount is
        // spread over the months its interval covers, so a yearly plan is not
        // twelve times a monthly one.
        const mrr = await this.db.execute<{ plan: string; currency: string; amount_cents: string }>(sql`
            SELECT p.slug AS plan,
                   pp.currency::text AS currency,
                   sum(pp.amount_cents::numeric / CASE pp.interval
                       WHEN 'month' THEN 1
                       WHEN 'quarter' THEN 3
                       WHEN 'semester' THEN 6
                       WHEN 'year' THEN 12
                   END)::text AS amount_cents
            FROM subscriptions s
            JOIN plan_prices pp ON pp.id = s.plan_price_id
            JOIN plans p ON p.id = s.plan_id
            WHERE s.status IN ('active', 'past_due')
            GROUP BY p.slug, pp.currency
        `)

        const canceling = await this.db.execute<{ count: string }>(sql`
            SELECT count(*)::text AS count
            FROM subscriptions s
            WHERE s.status = 'canceled' AND s.current_period_end > now()
        `)

        const statuses = byStatus.rows.map(
            (row): SubscriptionsByStatus => ({
                status: row.status as SubscriptionsByStatus['status'],
                gateway: row.gateway as SubscriptionsByStatus['gateway'],
                count: Number(row.count),
            }),
        )
        const countOf = (status: string): number =>
            statuses.filter((row) => row.status === status).reduce((total, row) => total + row.count, 0)

        return {
            byStatus: statuses,
            byPlan: byPlan.rows.map(
                (row): SubscriptionsByPlan => ({
                    plan: row.plan,
                    audience: row.audience as SubscriptionsByPlan['audience'],
                    count: Number(row.count),
                }),
            ),
            mrr: mrr.rows.map(
                (row): MrrByPlan => ({
                    plan: row.plan,
                    currency: row.currency as MrrByPlan['currency'],
                    amountCents: Math.round(Number(row.amount_cents)),
                }),
            ),
            activeSubscriptions: statuses.reduce((total, row) => total + row.count, 0),
            trialing: countOf('trialing'),
            pastDue: countOf('past_due'),
            canceling: Number(canceling.rows[0]?.count ?? 0),
        }
    }
}
