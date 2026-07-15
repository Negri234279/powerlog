import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'

import { plans } from './plans.schema'

/**
 * `plan_translations` — localized name/description for catalog plans. One row per
 * (plan, locale); the base values in `plans.name`/`plans.description` are the
 * default-locale (English) canonical text and the fallback, so only non-default
 * locales are stored here. Reads `COALESCE(t.name, plans.name)` against the
 * request locale, exactly like `exercise_translations`.
 */
export const planTranslations = pgTable(
    'plan_translations',
    {
        planId: uuid('plan_id')
            .notNull()
            .references(() => plans.id, { onDelete: 'cascade' }),
        locale: text('locale').notNull(),
        name: text('name').notNull(),
        description: text('description'),
    },
    (table) => [primaryKey({ columns: [table.planId, table.locale] })],
)
