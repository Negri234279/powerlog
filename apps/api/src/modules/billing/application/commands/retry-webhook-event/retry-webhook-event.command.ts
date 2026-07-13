/** Re-process a webhook that failed, from the payload the journal kept. */
export class RetryWebhookEventCommand {
    constructor(readonly eventId: string) {}
}
