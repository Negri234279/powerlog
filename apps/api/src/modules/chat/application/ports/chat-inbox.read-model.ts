/** The last message of a conversation, for the inbox preview. */
export interface ChatInboxLastMessage {
    id: string
    senderId: string
    body: string
    createdAt: Date
}

/**
 * One inbox row: a conversation from the viewer's side. For a coach this is one
 * row per athlete, for an athlete one per coach — same shape, mirrored. Presence
 * (online / last seen) is layered on in Chat.2/Chat.4 via `PresenceReader`; it's
 * intentionally absent here.
 */
export interface ChatInboxRow {
    conversationId: string
    /** The coach (for an athlete viewer) or athlete (for a coach viewer). */
    otherParticipantId: string
    /** Null for a freshly created conversation with no messages yet. */
    lastMessage: ChatInboxLastMessage | null
    /** Messages from the other participant past the viewer's read cursor. */
    unreadCount: number
}

/**
 * Read-model for the chat inbox. One grouped query per viewer rather than an
 * N+1 over conversations — the coaching/admin read-model pattern. Rows come back
 * ordered by most recent activity first.
 */
export abstract class ChatInboxReadModel {
    abstract listForUser(userId: string): Promise<ChatInboxRow[]>
}
