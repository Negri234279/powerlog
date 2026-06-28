import { doublePrecision, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { workoutExerciseEntries } from './workout-exercise-entries.schema'

/**
 * `workout_sets` — a set within an exercise entry. Splits programmed
 * (`planned_*`) from performed (`weight_kg`/`reps`) values; `e1rm_kg` is the
 * denormalised Epley estimate from the actual performance. Weights are kg.
 */
export const workoutSets = pgTable('workout_sets', {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id')
        .notNull()
        .references(() => workoutExerciseEntries.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    plannedWeightKg: doublePrecision('planned_weight_kg'),
    plannedReps: integer('planned_reps'),
    weightKg: doublePrecision('weight_kg'),
    reps: integer('reps'),
    rpe: doublePrecision('rpe'),
    rir: integer('rir'),
    e1rmKg: doublePrecision('e1rm_kg'),
    notes: text('notes'),
})
