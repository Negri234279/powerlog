import type { MessageEntity } from '../../domain/entities/message.entity'

/**
 * Push a live chat change out to connected clients. The chat module never imports
 * Socket.IO directly — it depends on this abstract port, the same spirit as
 * `RealtimeHub.publish()`. Chat.1 binds it to a no-op (`NullChatPusher`); Chat.2
 * swaps the binding for the WebSocket gateway, so the command handlers are
 * written once and never touched again for transport.
 *
 * Implementations are best-effort and must not throw into the command path: a
 * message that persisted is sent even if the live push fails (GraphQL is the
 * fallback when a socket isn't connected).
 */
export abstract class ChatPusher {
    /** A new message was posted to a conversation. */
    abstract messagePosted(input: {
        conversationId: string
        /** Participants to fan out to (coach + athlete). */
        recipientIds: string[]
        message: MessageEntity
    }): Promise<void>

    /**
     * A participant's read/delivery cursor advanced, so the other side's
     * double-check can move in real time.
     */
    abstract cursorAdvanced(input: {
        conversationId: string
        /** The participant whose cursor moved. */
        userId: string
        /** Who should learn about it (the other participant). */
        recipientIds: string[]
        kind: 'delivered' | 'read'
        /** The message id the cursor now points at. */
        messageId: string
    }): Promise<void>
}
