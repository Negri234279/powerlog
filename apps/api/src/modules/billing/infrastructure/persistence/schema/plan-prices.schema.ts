import { sql } from 'drizzle-orm'
import { boolean, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { plans } from './plans.schema'

/** Billing period. Mapped to each gateway's own interval unit + count on sync. */
export const planIntervalEnum = pgEnum('plan_interval', ['month', 'quarter', 'semester', 'year'])

/** Supported currencies. The user picks; the default follows their locale. */
export const currencyEnum = pgEnum('currency', ['EUR', 'USD'])

/**
 * `plan_prices` — an **immutable price version** of a plan.
 *
 * Changing a price never updates a row: it deactivates this one and inserts
 * another. Existing subscriptions keep pointing at the version they signed on, so
 * a price change cannot silently re-bill anyone — which is the opposite of how
 * entitlements work (those are read live from the plan, on purpose).
 *
 * The gateway ids are filled by the catalog sync (9.3/9.4), not at seed time: the
 * seed must not call an external API.
 */
export const planPrices = pgTable(
    'plan_prices',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        planId: uuid('plan_id')
            .notNull()
            .references(() => plans.id, { onDelete: 'cascade' }),
        interval: planIntervalEnum('interval').notNull(),
        currency: currencyEnum('currency').notNull(),
        amountCents: integer('amount_cents').notNull(),
        active: boolean('active').notNull().default(true),
        stripePriceId: text('stripe_price_id'),
        paypalPlanId: text('paypal_plan_id'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        // One sellable price per (plan, interval, currency). Old versions stay in the
        // table with `active = false` — they still have subscriptions on them.
        uniqueIndex('plan_prices_one_active_per_combo')
            .on(table.planId, table.interval, table.currency)
            .where(sql`${table.active}`),
    ],
)
