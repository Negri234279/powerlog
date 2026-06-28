import { doublePrecision, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { workoutTemplateExercises } from './workout-template-exercises.schema'

/**
 * `workout_template_sets` — a programmed set within a template exercise. Carries
 * only planned targets (no performed values / e1RM). Weights are kg.
 */
export const workoutTemplateSets = pgTable('workout_template_sets', {
    id: uuid('id').primaryKey().defaultRandom(),
    templateExerciseId: uuid('template_exercise_id')
        .notNull()
        .references(() => workoutTemplateExercises.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    plannedWeightKg: doublePrecision('planned_weight_kg'),
    plannedReps: integer('planned_reps'),
    rpe: doublePrecision('rpe'),
    rir: integer('rir'),
    notes: text('notes'),
})
