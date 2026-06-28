import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { exercises } from './exercises.schema'
import { workoutSessions } from './workout-sessions.schema'

/**
 * `workout_exercise_entries` — an exercise within a session, ordered. Deleting a
 * session cascades to its entries; `exercise_id` is a real FK to the catalog
 * (same module, so no boundary crossing).
 */
export const workoutExerciseEntries = pgTable('workout_exercise_entries', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
        .notNull()
        .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
        .notNull()
        .references(() => exercises.id),
    order: integer('order').notNull(),
    notes: text('notes'),
})
