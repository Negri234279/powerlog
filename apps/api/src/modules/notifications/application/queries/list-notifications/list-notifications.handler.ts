import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { NotificationEntity } from '../../../domain/entities/notification.entity'
import { NotificationRepository } from '../../../domain/repositories/notification.repository'
import { ListNotificationsQuery } from './list-notifications.query'
import { decodeNotificationCursor, encodeNotificationCursor } from './notification-cursor'

/** A page of notifications plus the cursor to fetch the next one. */
export interface NotificationsPage {
    items: NotificationEntity[]
    /** Token for the following page, or null when this is the last one. */
    nextCursor: string | null
    hasNextPage: boolean
}

@QueryHandler(ListNotificationsQuery)
export class ListNotificationsHandler implements IQueryHandler<ListNotificationsQuery, NotificationsPage> {
    constructor(private readonly notifications: NotificationRepository) {}

    async execute(query: ListNotificationsQuery): Promise<NotificationsPage> {
        const { items, hasNextPage } = await this.notifications.list({
            userId: query.userId,
            limit: query.limit,
            cursor: query.cursor ? decodeNotificationCursor(query.cursor) : undefined,
        })

        const last = items[items.length - 1]
        const nextCursor =
            hasNextPage && last ? encodeNotificationCursor({ createdAt: last.createdAt, id: last.id }) : null

        return { items, nextCursor, hasNextPage }
    }
}
