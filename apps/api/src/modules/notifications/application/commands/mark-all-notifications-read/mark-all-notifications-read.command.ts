/** Mark every unread notification of the caller as read. */
export class MarkAllNotificationsReadCommand {
    constructor(public readonly userId: string) {}
}
