/** Admin: end a manual grant now. Gateway-billed subscriptions are not revocable here. */
export class RevokeSubscriptionCommand {
    constructor(readonly subscriptionId: string) {}
}
