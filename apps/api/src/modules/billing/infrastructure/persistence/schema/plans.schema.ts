import { sql } from 'drizzle-orm'
import {
    boolean,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from 'drizzle-orm/pg-core'

/** Which catalog a plan belongs to. A coach plan also covers its holder's training. */
export const planAudienceEnum = pgEnum('plan_audience', ['athlete', 'coach'])

/** Catalog lifecycle: `draft` is invisible, `archived` takes no new signups. */
export const planStatusEnum = pgEnum('plan_status', ['draft', 'active', 'archived'])

/**
 * `plans` — the catalog.
 *
 * `entitlements` is jsonb, not a column per feature: the admin edits the catalog
 * from the panel, so adding a check must not need a migration. Its shape is
 * validated by zod on the way in and on the way out (`PlanAggregate.rehydrate`),
 * which is what Postgres can't do for us here.
 *
 * `slug` is the stable identifier and doubles as a **metric label**, so it stays
 * bounded (a few dozen at most, all created by an admin) — never a user id.
 */
export const plans = pgTable(
    'plans',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        audience: planAudienceEnum('audience').notNull(),
        slug: text('slug').notNull().unique(),
        name: text('name').notNull(),
        description: text('description'),
        status: planStatusEnum('status').notNull().default('draft'),
        // The fallback of its audience: a free user has NO subscription row at all,
        // so this flag is how a user with nothing resolves to something.
        isFree: boolean('is_free').notNull().default(false),
        sortOrder: integer('sort_order').notNull().default(0),
        entitlements: jsonb('entitlements').notNull(),
        // The provider-side product this plan was published as. Null until an admin
        // syncs the catalog — the seed migration never calls an external API.
        stripeProductId: text('stripe_product_id'),
        paypalProductId: text('paypal_product_id'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        // At most ONE active free plan per audience. Postgres holds the invariant the
        // aggregate cannot: it is a statement about the catalog, not about one row.
        // Archived free plans fall out of the index, so the history stays.
        uniqueIndex('plans_one_active_free_per_audience')
            .on(table.audience)
            .where(sql`${table.isFree} AND ${table.status} = 'active'`),
        // The catalog listing: active plans of an audience, in display order.
        index('plans_audience_status_sort').on(table.audience, table.status, table.sortOrder),
    ],
)
