import type { MessageEntity } from '../entities/message.entity'

/** Keyset cursor: the (createdAt, id) of the last row of the previous page. */
export interface ChatCursor {
    createdAt: Date
    id: string
}

/** Filter for a conversation's message list: keyset-paginated, newest first. */
export interface MessageListFilter {
    conversationId: string
    /** Page size (the impl fetches one extra row to compute `hasNextPage`). */
    limit: number
    cursor?: ChatCursor
}

/** A keyset page: trimmed rows plus whether another page follows. */
export interface MessageSlice {
    items: MessageEntity[]
    hasNextPage: boolean
}

/**
 * Persistence port for messages. Reads are conversation-scoped and keyset-
 * paginated over `(createdAt, id)` (newest first), mirroring notifications.
 */
export abstract class MessageRepository {
    abstract create(message: MessageEntity): Promise<void>
    abstract list(filter: MessageListFilter): Promise<MessageSlice>
    /** The latest message of a conversation, or null when empty. */
    abstract latest(conversationId: string): Promise<MessageEntity | null>
}
