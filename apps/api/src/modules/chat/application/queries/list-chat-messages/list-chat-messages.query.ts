/**
 * A page of a conversation's messages for the viewer. Newest first, keyset-
 * paginated. `viewerId` both authorizes (must be a participant) and picks the
 * receiver cursor used to derive the double-check of the viewer's own messages.
 */
export class ListChatMessagesQuery {
    constructor(
        public readonly viewerId: string,
        public readonly conversationId: string,
        public readonly limit: number,
        public readonly cursor?: string,
    ) {}
}
