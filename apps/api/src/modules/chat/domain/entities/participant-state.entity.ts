export interface ParticipantStateProps {
    conversationId: string
    userId: string
    lastDeliveredMessageId: string | null
    lastReadMessageId: string | null
    lastReadAt: Date | null
}

/**
 * `ParticipantStateEntity` — the read/delivery cursor for ONE participant in a
 * conversation, not one row per message. This is what WhatsApp/Slack actually
 * do: a per-message "read" flag would be a write for every message the other
 * side scans past. The double-check of a given message is DERIVED by comparing
 * the message against this cursor (see `read-status.ts`), never persisted per
 * message.
 */
export class ParticipantStateEntity {
    private constructor(private readonly props: ParticipantStateProps) {}

    /** A fresh cursor: nothing delivered or read yet. */
    static empty(conversationId: string, userId: string): ParticipantStateEntity {
        return new ParticipantStateEntity({
            conversationId,
            userId,
            lastDeliveredMessageId: null,
            lastReadMessageId: null,
            lastReadAt: null,
        })
    }

    /** Reconstruct from persistence. */
    static rehydrate(props: ParticipantStateProps): ParticipantStateEntity {
        return new ParticipantStateEntity(props)
    }

    /** Advance the delivered cursor to a message. Read implies delivered. */
    markDelivered(messageId: string): void {
        this.props.lastDeliveredMessageId = messageId
    }

    /** Advance the read cursor (and delivered, since read implies delivered). */
    markRead(messageId: string, now: Date): void {
        this.props.lastReadMessageId = messageId
        this.props.lastDeliveredMessageId = messageId
        this.props.lastReadAt = now
    }

    get conversationId(): string {
        return this.props.conversationId
    }

    get userId(): string {
        return this.props.userId
    }

    get lastDeliveredMessageId(): string | null {
        return this.props.lastDeliveredMessageId
    }

    get lastReadMessageId(): string | null {
        return this.props.lastReadMessageId
    }
    
    get lastReadAt(): Date | null {
        return this.props.lastReadAt
    }
}
