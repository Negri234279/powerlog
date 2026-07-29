/** Clear the caller's view of a conversation: hide its history up to now, but
 *  keep the conversation in their inbox (WhatsApp "clear chat"). */
export class ClearConversationCommand {
    constructor(
        public readonly userId: string,
        public readonly conversationId: string,
    ) {}
}
