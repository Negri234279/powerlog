import type { ConversationEntity } from '../../../src/modules/chat/domain/entities/conversation.entity'
import { ConversationRepository } from '../../../src/modules/chat/domain/repositories/conversation.repository'

/** In-memory ConversationRepository implementing the real abstract interface. */
export class InMemoryConversationRepository extends ConversationRepository {
    private readonly items: ConversationEntity[] = []

    constructor(seed: ConversationEntity[] = []) {
        super()
        this.items.push(...seed)
    }

    async findById(id: string): Promise<ConversationEntity | null> {
        return this.items.find((c) => c.id === id) ?? null
    }

    async findByPair(coachId: string, athleteId: string): Promise<ConversationEntity | null> {
        return this.items.find((c) => c.coachId === coachId && c.athleteId === athleteId) ?? null
    }

    async createIfAbsent(conversation: ConversationEntity): Promise<ConversationEntity> {
        const existing = await this.findByPair(conversation.coachId, conversation.athleteId)
        if (existing) return existing

        this.items.push(conversation)
        return conversation
    }

    /** Test inspection: every stored conversation. */
    all(): ConversationEntity[] {
        return [...this.items]
    }
}
