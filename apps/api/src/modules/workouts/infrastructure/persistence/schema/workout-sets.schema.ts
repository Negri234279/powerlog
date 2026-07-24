import { doublePrecision, index, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { SET_OUTCOMES } from '../../../domain/set-outcome'
import { workoutExerciseEntries } from './workout-exercise-entries.schema'

export const setOutcomeEnum = pgEnum('set_outcome', SET_OUTCOMES)

/**
 * `workout_sets` — a set within an exercise entry. Splits programmed
 * (`planned_*`, intensity included) from performed (`weight_kg`/`reps`/`rpe`/`rir`)
 * values; `e1rm_kg` is the denormalised Epley estimate from the actual
 * performance. `outcome` is NULL while the set is pending. Weights are kg.
 *
 * Each planned target is a range stored as its two bounds (`5` is `min = max = 5`),
 * carried over from whatever programmed it. The performed values never are —
 * you lifted what you lifted.
 */
export const workoutSets = pgTable(
    'workout_sets',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        entryId: uuid('entry_id')
            .notNull()
            .references(() => workoutExerciseEntries.id, { onDelete: 'cascade' }),
        order: integer('order').notNull(),
        plannedWeightKgMin: doublePrecision('planned_weight_kg_min'),
        plannedWeightKgMax: doublePrecision('planned_weight_kg_max'),
        plannedRepsMin: integer('planned_reps_min'),
        plannedRepsMax: integer('planned_reps_max'),
        plannedRpeMin: doublePrecision('planned_rpe_min'),
        plannedRpeMax: doublePrecision('planned_rpe_max'),
        plannedRirMin: integer('planned_rir_min'),
        plannedRirMax: integer('planned_rir_max'),
        weightKg: doublePrecision('weight_kg'),
        reps: integer('reps'),
        rpe: doublePrecision('rpe'),
        rir: integer('rir'),
        e1rmKg: doublePrecision('e1rm_kg'),
        outcome: setOutcomeEnum('outcome'),
        notes: text('notes'),
    },
    // Every set lookup is by its parent entry (loading a session, aggregating volume/PRs).
    (t) => [index('workout_sets_entry_idx').on(t.entryId)],
)
