/** Send a text message to a conversation the caller is a participant of. */
export class SendChatMessageCommand {
    constructor(
        public readonly senderId: string,
        public readonly conversationId: string,
        public readonly body: string,
    ) {}
}
