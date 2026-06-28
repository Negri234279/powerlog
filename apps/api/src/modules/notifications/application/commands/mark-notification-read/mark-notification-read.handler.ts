import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Clock } from '../../ports/clock.port'
import { NotificationRepository } from '../../../domain/repositories/notification.repository'
import { MarkNotificationReadCommand } from './mark-notification-read.command'

@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler implements ICommandHandler<MarkNotificationReadCommand, boolean> {
    constructor(
        private readonly notifications: NotificationRepository,
        private readonly clock: Clock,
    ) {}

    /** Returns true if the notification existed, was the caller's and got marked. */
    async execute(command: MarkNotificationReadCommand): Promise<boolean> {
        return this.notifications.markRead(command.userId, command.notificationId, this.clock.now())
    }
}
