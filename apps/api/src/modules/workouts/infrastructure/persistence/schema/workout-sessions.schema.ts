import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { WORKOUT_STATUSES } from '../../../domain/workout-status'

export const workoutStatusEnum = pgEnum('workout_status', WORKOUT_STATUSES)

/**
 * `workout_sessions` — a training session. `user_id`, `planned_by_user_id` and
 * `mesocycle_id` are SOFT references (no cross-module or cross-aggregate FK);
 * cleanup on account deletion is driven by an integration event. A session
 * generated from a mesocycle carries its `mesocycle_id` + 1-based `mesocycle_week`.
 */
export const workoutSessions = pgTable(
    'workout_sessions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id').notNull(),
        status: workoutStatusEnum('status').notNull().default('planned'),
        performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
        notes: text('notes'),
        plannedByUserId: uuid('planned_by_user_id'),
        mesocycleId: uuid('mesocycle_id'),
        mesocycleWeek: integer('mesocycle_week'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    // Every per-user read filters by user_id (+ status) and orders by performed_at;
    // Postgres scans this btree backwards for the DESC ordering. Serves history,
    // exercise-stats and the analytics dashboard.
    (t) => [
        index('workout_sessions_user_status_performed_idx').on(t.userId, t.status, t.performedAt),
        // Which weeks of a mesocycle are already generated (get-mesocycle + generate guard).
        index('workout_sessions_mesocycle_idx').on(t.mesocycleId, t.mesocycleWeek),
    ],
)
