import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Clock } from '../../ports/clock.port'
import { NotificationRepository } from '../../../domain/repositories/notification.repository'
import { MarkAllNotificationsReadCommand } from './mark-all-notifications-read.command'

@CommandHandler(MarkAllNotificationsReadCommand)
export class MarkAllNotificationsReadHandler implements ICommandHandler<MarkAllNotificationsReadCommand, number> {
    constructor(
        private readonly notifications: NotificationRepository,
        private readonly clock: Clock,
    ) {}

    /** Returns how many notifications were marked read. */
    async execute(command: MarkAllNotificationsReadCommand): Promise<number> {
        return this.notifications.markAllRead(command.userId, this.clock.now())
    }
}
