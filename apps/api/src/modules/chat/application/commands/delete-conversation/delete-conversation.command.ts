/** Delete the caller's view of a conversation: clear its history AND drop it from
 *  their inbox until a newer message arrives (WhatsApp "delete chat"). */
export class DeleteConversationCommand {
    constructor(
        public readonly userId: string,
        public readonly conversationId: string,
    ) {}
}
