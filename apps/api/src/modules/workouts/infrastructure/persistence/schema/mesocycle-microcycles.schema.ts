import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { mesocycles } from './mesocycles.schema'

/**
 * `mesocycle_microcycles` — one week within a mesocycle, ordered by `week_index`.
 * Deleting a mesocycle cascades to its microcycles.
 */
export const mesocycleMicrocycles = pgTable('mesocycle_microcycles', {
    id: uuid('id').primaryKey().defaultRandom(),
    mesocycleId: uuid('mesocycle_id')
        .notNull()
        .references(() => mesocycles.id, { onDelete: 'cascade' }),
    weekIndex: integer('week_index').notNull(),
    label: text('label'),
    notes: text('notes'),
})
