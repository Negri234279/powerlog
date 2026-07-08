import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { mesocycleMicrocycles } from './mesocycle-microcycles.schema'

/**
 * `mesocycle_days` — one training day within a microcycle, ordered. `day_offset`
 * (0–6) places it inside the week when the microcycle is generated into dated
 * sessions. Deleting a microcycle cascades to its days.
 */
export const mesocycleDays = pgTable('mesocycle_days', {
    id: uuid('id').primaryKey().defaultRandom(),
    microcycleId: uuid('microcycle_id')
        .notNull()
        .references(() => mesocycleMicrocycles.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    dayOffset: integer('day_offset').notNull(),
    label: text('label'),
    notes: text('notes'),
})
