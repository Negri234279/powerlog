/** Stop the subscription renewing. The user keeps it until the period they paid for ends. */
export class CancelSubscriptionCommand {
    constructor(readonly userId: string) {}
}

/** Undo a scheduled cancellation, while the paid period is still running. */
export class ResumeSubscriptionCommand {
    constructor(readonly userId: string) {}
}

/** Move to another plan (or another interval/currency of the same one). */
export class ChangePlanCommand {
    constructor(
        readonly userId: string,
        readonly planPriceId: string,
    ) {}
}
