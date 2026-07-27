/**
 * Resolve a conversation's participants for a viewer who claims to be one — the
 * WS gateway uses it to authorize joining a conversation room. Throws
 * `CONVERSATION_NOT_FOUND` / `NOT_YOUR_CONVERSATION` exactly like the message
 * queries, so authorization lives in the chat module, not the transport.
 */
export class GetConversationParticipantsQuery {
    constructor(
        public readonly viewerId: string,
        public readonly conversationId: string,
    ) {}
}
