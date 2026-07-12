import { date, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { MESOCYCLE_STATUSES } from '../../../domain/mesocycle-status'

export const mesocycleStatusEnum = pgEnum('mesocycle_status', MESOCYCLE_STATUSES)

/**
 * `mesocycles` — a multi-week training block. `owner_id` (the athlete who trains
 * it) and `planned_by_user_id` (the coach who plans it, when any) are SOFT
 * references to the auth `users` (no cross-module FK); cleanup on account
 * deletion is driven by an integration event. `start_date` anchors week 1 for
 * session generation.
 */
export const mesocycles = pgTable(
    'mesocycles',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        ownerId: uuid('owner_id').notNull(),
        plannedByUserId: uuid('planned_by_user_id'),
        name: text('name').notNull(),
        notes: text('notes'),
        goal: text('goal'),
        startDate: date('start_date', { mode: 'date' }),
        status: mesocycleStatusEnum('status').notNull().default('draft'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    // The list is always owner-scoped, ordered by recency.
    (t) => [index('mesocycles_owner_idx').on(t.ownerId)],
)
