import { sql } from 'drizzle-orm'
import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { planPrices } from './plan-prices.schema'
import { plans } from './plans.schema'

/** Where it is billed. `manual` = granted by an admin (comp, support, testing). */
export const paymentGatewayEnum = pgEnum('payment_gateway', ['stripe', 'paypal', 'manual'])

/** See `domain/subscription-status.ts` for what each one means for access. */
export const subscriptionStatusEnum = pgEnum('subscription_status', [
    'incomplete',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'expired',
])

/**
 * `subscriptions` — the local projection of what the gateway is billing.
 *
 * `user_id` is a SOFT reference (no DB foreign key): a real FK would make this
 * file import the auth module's schema and cross a module boundary. The rows of a
 * deleted account are cleaned up through an integration event, like the AI drafts.
 *
 * The gateway remains the source of truth for the money. This table is what we
 * decide entitlements from, kept in step by the webhook pipeline (9.3/9.4) and
 * audited by the reconciliation job (9.5).
 */
export const subscriptions = pgTable(
    'subscriptions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id').notNull(),
        planId: uuid('plan_id')
            .notNull()
            .references(() => plans.id),
        // Null for `manual` grants: nobody is being charged, so there is no price.
        planPriceId: uuid('plan_price_id').references(() => planPrices.id),
        gateway: paymentGatewayEnum('gateway').notNull(),
        gatewayCustomerId: text('gateway_customer_id'),
        gatewaySubscriptionId: text('gateway_subscription_id').unique(),
        status: subscriptionStatusEnum('status').notNull(),
        currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
        currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
        // It will not renew; the user keeps the plan until `current_period_end`.
        cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
        canceledAt: timestamp('canceled_at', { withTimezone: true }),
        // A downgrade that is paid for but not yet applied — it lands on renewal.
        pendingPlanPriceId: uuid('pending_plan_price_id').references(() => planPrices.id),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        // One LIVE subscription per user. `expired` rows fall out of the index, so
        // the billing history stays; a `canceled` one keeps its slot until it
        // expires, so nobody can stack a second subscription on top of time they
        // have already paid for. Same partial-index trick as the AI drafts.
        uniqueIndex('subscriptions_one_live_per_user')
            .on(table.userId)
            .where(sql`${table.status} IN ('incomplete', 'trialing', 'active', 'past_due', 'canceled')`),
        // The renewal/expiry sweeps scan by period end.
        index('subscriptions_status_period_end').on(table.status, table.currentPeriodEnd),
    ],
)
