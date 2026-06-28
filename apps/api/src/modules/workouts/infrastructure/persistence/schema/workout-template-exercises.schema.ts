import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { exercises } from './exercises.schema'
import { workoutTemplates } from './workout-templates.schema'

/**
 * `workout_template_exercises` — an exercise within a template, ordered.
 * Deleting a template cascades to its exercises; `exercise_id` is a real FK to
 * the catalog (same module, so no boundary crossing).
 */
export const workoutTemplateExercises = pgTable('workout_template_exercises', {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
        .notNull()
        .references(() => workoutTemplates.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
        .notNull()
        .references(() => exercises.id),
    order: integer('order').notNull(),
    notes: text('notes'),
})
