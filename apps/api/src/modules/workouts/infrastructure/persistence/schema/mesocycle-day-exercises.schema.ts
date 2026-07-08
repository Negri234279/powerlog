import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { exercises } from './exercises.schema'
import { mesocycleDays } from './mesocycle-days.schema'

/**
 * `mesocycle_day_exercises` — an exercise within a microcycle day, ordered.
 * Deleting a day cascades to its exercises; `exercise_id` is a real FK to the
 * catalog (same module, so no boundary crossing).
 */
export const mesocycleDayExercises = pgTable('mesocycle_day_exercises', {
    id: uuid('id').primaryKey().defaultRandom(),
    dayId: uuid('day_id')
        .notNull()
        .references(() => mesocycleDays.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
        .notNull()
        .references(() => exercises.id),
    order: integer('order').notNull(),
    notes: text('notes'),
})
