import type { ParticipantStateEntity } from '../entities/participant-state.entity'
import type { ReceiverCursor } from '../read-status'

/**
 * Persistence port for per-participant read/delivery cursors. The row is keyed by
 * `(conversationId, userId)`; writes upsert that single row rather than touching
 * per-message state.
 */
export abstract class ParticipantStateRepository {
    abstract get(conversationId: string, userId: string): Promise<ParticipantStateEntity | null>
    abstract upsert(state: ParticipantStateEntity): Promise<void>
    /**
     * How many messages authored by the OTHER participant sit after `userId`'s
     * read cursor — the unread badge for that user in that conversation.
     */
    abstract countUnread(conversationId: string, userId: string): Promise<number>
    /**
     * `userId`'s delivered/read cursors resolved to their `(createdAt, id)` keys,
     * so the sender's double-check can be derived against them. Missing cursors
     * come back as null.
     */
    abstract receiverCursor(conversationId: string, userId: string): Promise<ReceiverCursor>
}
