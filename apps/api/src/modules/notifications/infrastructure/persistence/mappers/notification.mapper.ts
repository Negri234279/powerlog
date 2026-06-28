import { NotificationEntity } from '../../../domain/entities/notification.entity'
import type { notifications } from '../schema/notifications.schema'

type NotificationRow = typeof notifications.$inferSelect

/** Maps the Notification entity to/from its `notifications` row. */
export const NotificationMapper = {
    toDomain(row: NotificationRow): NotificationEntity {
        return NotificationEntity.rehydrate({
            id: row.id,
            userId: row.userId,
            type: row.type,
            data: row.data,
            readAt: row.readAt,
            createdAt: row.createdAt,
        })
    },

    toPersistence(notification: NotificationEntity): typeof notifications.$inferInsert {
        return {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            data: notification.data,
            readAt: notification.readAt,
            createdAt: notification.createdAt,
        }
    },
}
