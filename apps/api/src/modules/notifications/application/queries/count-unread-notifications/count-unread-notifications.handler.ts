import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { NotificationRepository } from '../../../domain/repositories/notification.repository'
import { CountUnreadNotificationsQuery } from './count-unread-notifications.query'

@QueryHandler(CountUnreadNotificationsQuery)
export class CountUnreadNotificationsHandler implements IQueryHandler<CountUnreadNotificationsQuery, number> {
    constructor(private readonly notifications: NotificationRepository) {}

    async execute(query: CountUnreadNotificationsQuery): Promise<number> {
        return this.notifications.countUnread(query.userId)
    }
}
