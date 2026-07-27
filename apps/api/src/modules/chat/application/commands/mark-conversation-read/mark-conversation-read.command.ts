/** Advance the caller's read cursor to the latest message in a conversation. */
export class MarkConversationReadCommand {
    constructor(
        public readonly userId: string,
        public readonly conversationId: string,
    ) {}
}
