import { doublePrecision, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { workoutTemplateExercises } from './workout-template-exercises.schema'

/**
 * `workout_template_sets` — a programmed set within a template exercise. Carries
 * only planned targets (no performed values / e1RM). Weights are kg.
 *
 * Every target is a range stored as its two bounds: `5` is `min = max = 5`, a
 * `5-8` is `min 5, max 8`. Both bounds are NULL together — a target is either
 * planned or it isn't.
 */
export const workoutTemplateSets = pgTable('workout_template_sets', {
    id: uuid('id').primaryKey().defaultRandom(),
    templateExerciseId: uuid('template_exercise_id')
        .notNull()
        .references(() => workoutTemplateExercises.id, { onDelete: 'cascade' }),
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
