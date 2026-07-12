import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { NotificationEntity } from '../../../domain/entities/notification.entity'
import {
    type NotificationListFilter,
    type NotificationSlice,
    NotificationRepository,
} from '../../../domain/repositories/notification.repository'
import { notifications } from '../schema/notifications.schema'
import { NotificationMapper } from '../mappers/notification.mapper'

@Injectable()
export class DrizzleNotificationRepository extends NotificationRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async create(notification: NotificationEntity): Promise<void> {
        await this.db.insert(notifications).values(NotificationMapper.toPersistence(notification))
    }

    async list(filter: NotificationListFilter): Promise<NotificationSlice> {
        const conditions = [eq(notifications.userId, filter.userId)]
        if (filter.cursor) {
            // Keyset: rows strictly "after" the cursor under (createdAt, id) DESC.
            conditions.push(
                sql`(${notifications.createdAt}, ${notifications.id}) < (${filter.cursor.createdAt.toISOString()}::timestamptz, ${filter.cursor.id}::uuid)`,
            )
        }

        const rows = await this.db
            .select()
            .from(notifications)
            .where(and(...conditions))
            .orderBy(desc(notifications.createdAt), desc(notifications.id))
            .limit(filter.limit + 1)

        const hasNextPage = rows.length > filter.limit
        const page = hasNextPage ? rows.slice(0, filter.limit) : rows
        return { hasNextPage, items: page.map(NotificationMapper.toDomain) }
    }

    async countUnread(userId: string): Promise<number> {
        const [row] = await this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(notifications)
            .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
        return row?.count ?? 0
    }

    async markRead(userId: string, id: string, now: Date): Promise<boolean> {
        const updated = await this.db
            .update(notifications)
            .set({ readAt: now })
            .where(and(eq(notifications.id, id), eq(notifications.userId, userId), isNull(notifications.readAt)))
            .returning({ id: notifications.id })
        return updated.length > 0
    }

    async markAllRead(userId: string, now: Date): Promise<number> {
        const updated = await this.db
            .update(notifications)
            .set({ readAt: now })
            .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
            .returning({ id: notifications.id })
        return updated.length
    }

    async delete(userId: string, id: string): Promise<boolean> {
        // userId in the WHERE, not a read-then-delete: someone else's id simply
        // matches no row.
        const deleted = await this.db
            .delete(notifications)
            .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
            .returning({ id: notifications.id })
        return deleted.length > 0
    }

    async deleteRead(userId: string): Promise<number> {
        const deleted = await this.db
            .delete(notifications)
            .where(and(eq(notifications.userId, userId), isNotNull(notifications.readAt)))
            .returning({ id: notifications.id })
        return deleted.length
    }
}
