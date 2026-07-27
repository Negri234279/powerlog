/** Advance the caller's delivery cursor to the latest message in a conversation. */
export class MarkConversationDeliveredCommand {
    constructor(
        public readonly userId: string,
        public readonly conversationId: string,
    ) {}
}
