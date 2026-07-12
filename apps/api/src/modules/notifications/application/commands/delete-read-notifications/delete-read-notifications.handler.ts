import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { NotificationRepository } from '../../../domain/repositories/notification.repository'
import { DeleteReadNotificationsCommand } from './delete-read-notifications.command'

@CommandHandler(DeleteReadNotificationsCommand)
export class DeleteReadNotificationsHandler implements ICommandHandler<DeleteReadNotificationsCommand, number> {
    constructor(private readonly notifications: NotificationRepository) {}

    /** Returns how many were cleared. Unread ones survive on purpose — the user
     *  can't lose something they never saw. */
    async execute(command: DeleteReadNotificationsCommand): Promise<number> {
        return this.notifications.deleteRead(command.userId)
    }
}
