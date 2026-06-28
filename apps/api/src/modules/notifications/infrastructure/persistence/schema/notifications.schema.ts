import { jsonb, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

import type { NotificationData } from '../../../domain/entities/notification.entity'
import { NOTIFICATION_TYPES } from '../../../domain/notification-type'

/** Notification kinds; values derive from the domain single source of truth. */
export const notificationTypeEnum = pgEnum('notification_type', NOTIFICATION_TYPES)

/**
 * `notifications` — one row per in-app notification. `user_id` is a SOFT
 * reference to the auth `users` (no cross-module FK); cleanup on account
 * deletion will be driven by an integration event. `data` holds type-specific
 * payload (e.g. invitation ids) as jsonb.
 */
export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    type: notificationTypeEnum('type').notNull(),
    data: jsonb('data').$type<NotificationData>().notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
