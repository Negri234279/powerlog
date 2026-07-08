import { doublePrecision, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { mesocycleDayExercises } from './mesocycle-day-exercises.schema'

/**
 * `mesocycle_day_sets` — a programmed set within a microcycle day exercise.
 * Carries only planned targets (no performed values / e1RM). Weights are kg.
 */
export const mesocycleDaySets = pgTable('mesocycle_day_sets', {
    id: uuid('id').primaryKey().defaultRandom(),
    dayExerciseId: uuid('day_exercise_id')
        .notNull()
        .references(() => mesocycleDayExercises.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    plannedWeightKg: doublePrecision('planned_weight_kg'),
    plannedReps: integer('planned_reps'),
    rpe: doublePrecision('rpe'),
    rir: integer('rir'),
    notes: text('notes'),
})
