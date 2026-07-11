import { index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { aiProviderEnum } from './ai-provider-configs.schema'

/**
 * `ai_usage` — an append-only meter: one row per LLM completion the user's own
 * key paid for (retries included, since each one burns tokens). Written from an
 * async event handler off the request path, so metering never slows the feature.
 *
 * The link to `users` is a SOFT reference (no DB foreign key), like
 * `ai_provider_configs`: an FK would force this file to import the auth module's
 * schema. Erasure on account deletion is driven by the user-deleted event.
 *
 * The unit price is SNAPSHOTTED per row (the providers do not expose prices via
 * API — they come from a static table). Freezing the rate here keeps historical
 * cost stable when the table is later updated, and lets the summary read from
 * itself. Price columns are nullable: an unknown model records tokens with no
 * cost, shown as "—" rather than a wrong number.
 */
export const aiUsage = pgTable(
    'ai_usage',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id').notNull(),
        provider: aiProviderEnum('provider').notNull(),
        // The model that actually answered, as reported by the provider.
        model: text('model').notNull(),
        inputTokens: integer('input_tokens').notNull(),
        outputTokens: integer('output_tokens').notNull(),
        // USD per 1M tokens at the time of the call; null → price unknown.
        inputPricePerMtok: numeric('input_price_per_mtok', { precision: 12, scale: 6 }),
        outputPricePerMtok: numeric('output_price_per_mtok', { precision: 12, scale: 6 }),
        // Computed cost snapshot in `currency`; null when the price was unknown.
        inputCost: numeric('input_cost', { precision: 14, scale: 8 }),
        outputCost: numeric('output_cost', { precision: 14, scale: 8 }),
        totalCost: numeric('total_cost', { precision: 14, scale: 8 }),
        currency: text('currency').notNull().default('USD'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index('ai_usage_user_created_idx').on(table.userId, table.createdAt)],
)
