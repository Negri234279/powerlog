import type { ConversationEntity } from '../entities/conversation.entity'

/**
 * Persistence port for conversations. A conversation is identified by its id, and
 * uniquely by its `(coachId, athleteId)` pair — creation is idempotent so the
 * link-established handler and the migration backfill can both run safely.
 */
export abstract class ConversationRepository {
    abstract findById(id: string): Promise<ConversationEntity | null>
    abstract findByPair(coachId: string, athleteId: string): Promise<ConversationEntity | null>
    /**
     * Insert the conversation unless one already exists for its pair. Returns the
     * live conversation either way (the existing one on conflict).
     */
    abstract createIfAbsent(conversation: ConversationEntity): Promise<ConversationEntity>
}
