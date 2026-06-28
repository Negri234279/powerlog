/** Number of unread notifications for the caller (the bell badge count). */
export class CountUnreadNotificationsQuery {
    constructor(public readonly userId: string) {}
}
