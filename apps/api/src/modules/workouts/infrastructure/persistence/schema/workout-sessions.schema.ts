import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { WORKOUT_STATUSES } from '../../../domain/workout-status'

export const workoutStatusEnum = pgEnum('workout_status', WORKOUT_STATUSES)

/**
 * `workout_sessions` — a training session. `user_id` and `planned_by_user_id`
 * are SOFT references to the auth `users` (no cross-module FK); cleanup on
 * account deletion will be driven by an integration event.
 */
export const workoutSessions = pgTable('workout_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    status: workoutStatusEnum('status').notNull().default('planned'),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
    notes: text('notes'),
    plannedByUserId: uuid('planned_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
