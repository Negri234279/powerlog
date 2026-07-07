import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'

import { exercises } from './exercises.schema'

/**
 * `exercise_translations` — localized display names for catalog exercises. One
 * row per (exercise, locale); the base English name stays in `exercises.name`
 * and is the fallback, so only non-English locales are stored here. Reads
 * `COALESCE(t.name, exercises.name)` against the request locale.
 */
export const exerciseTranslations = pgTable(
    'exercise_translations',
    {
        exerciseId: uuid('exercise_id')
            .notNull()
            .references(() => exercises.id, { onDelete: 'cascade' }),
        locale: text('locale').notNull(),
        name: text('name').notNull(),
    },
    (table) => [primaryKey({ columns: [table.exerciseId, table.locale] })],
)
