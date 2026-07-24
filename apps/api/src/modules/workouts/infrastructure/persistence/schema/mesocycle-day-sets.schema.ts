import { doublePrecision, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { mesocycleDayExercises } from './mesocycle-day-exercises.schema'

/**
 * `mesocycle_day_sets` — a programmed set within a microcycle day exercise.
 * Carries only planned targets (no performed values / e1RM). Weights are kg.
 *
 * Every target is a range stored as its two bounds — see
 * `workout_template_sets`, which programmes the same way.
 */
export const mesocycleDaySets = pgTable('mesocycle_day_sets', {
    id: uuid('id').primaryKey().defaultRandom(),
    dayExerciseId: uuid('day_exercise_id')
        .notNull()
        .references(() => mesocycleDayExercises.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    plannedWeightKgMin: doublePrecision('planned_weight_kg_min'),
    plannedWeightKgMax: doublePrecision('planned_weight_kg_max'),
    plannedRepsMin: integer('planned_reps_min'),
    plannedRepsMax: integer('planned_reps_max'),
    rpeMin: doublePrecision('rpe_min'),
    rpeMax: doublePrecision('rpe_max'),
    rirMin: integer('rir_min'),
    rirMax: integer('rir_max'),
    notes: text('notes'),
})
