/** Clear the caller's inbox of everything they've already read. */
export class DeleteReadNotificationsCommand {
    constructor(public readonly userId: string) {}
}
