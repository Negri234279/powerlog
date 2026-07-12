import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { NotificationRepository } from '../../../domain/repositories/notification.repository'
import { DeleteNotificationCommand } from './delete-notification.command'

@CommandHandler(DeleteNotificationCommand)
export class DeleteNotificationHandler implements ICommandHandler<DeleteNotificationCommand, boolean> {
    constructor(private readonly notifications: NotificationRepository) {}

    /**
     * Returns true if the notification existed and was the caller's. Someone
     * else's id is a silent no-op (false), never an error: the repository scopes
     * the delete by userId, so a probe can't tell an id apart from a foreign one.
     */
    async execute(command: DeleteNotificationCommand): Promise<boolean> {
        return this.notifications.delete(command.userId, command.notificationId)
    }
}
