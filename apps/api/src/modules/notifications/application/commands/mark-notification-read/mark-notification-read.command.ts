/** Mark one of the caller's notifications as read. */
export class MarkNotificationReadCommand {
    constructor(
        public readonly userId: string,
        public readonly notificationId: string,
    ) {}
}
