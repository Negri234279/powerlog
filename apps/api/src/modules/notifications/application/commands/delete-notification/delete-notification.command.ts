/** Remove one notification from the caller's inbox (read or not). */
export class DeleteNotificationCommand {
    constructor(
        public readonly userId: string,
        public readonly notificationId: string,
    ) {}
}
