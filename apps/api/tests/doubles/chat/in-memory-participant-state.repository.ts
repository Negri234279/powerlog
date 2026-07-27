import type { ParticipantStateEntity } from '../../../src/modules/chat/domain/entities/participant-state.entity'
import { ParticipantStateRepository } from '../../../src/modules/chat/domain/repositories/participant-state.repository'
import type { MessageKey, ReceiverCursor } from '../../../src/modules/chat/domain/read-status'
import type { InMemoryMessageRepository } from './in-memory-message.repository'

/**
 * In-memory ParticipantStateRepository implementing the real abstract interface.
 * Resolves cursor ids to `(createdAt, id)` keys through the message double, just
 * like the Drizzle impl joins to `chat_messages`.
 */
export class InMemoryParticipantStateRepository extends ParticipantStateRepository {
    private readonly states = new Map<string, ParticipantStateEntity>()

    constructor(private readonly messages: InMemoryMessageRepository) {
        super()
    }

    async get(conversationId: string, userId: string): Promise<ParticipantStateEntity | null> {
        return this.states.get(this.key(conversationId, userId)) ?? null
    }

    async upsert(state: ParticipantStateEntity): Promise<void> {
        this.states.set(this.key(state.conversationId, state.userId), state)
    }

    async countUnread(conversationId: string, userId: string): Promise<number> {
        const state = this.states.get(this.key(conversationId, userId))
        const readKey = this.keyOf(state?.lastReadMessageId ?? null)

        return this.messages
            .all(conversationId)
            .filter(
                (m) =>
                    m.senderId !== userId &&
                    (!readKey || this.compare({ id: m.id, createdAt: m.createdAt }, readKey) > 0),
            ).length
    }

    async receiverCursor(conversationId: string, userId: string): Promise<ReceiverCursor> {
        const state = this.states.get(this.key(conversationId, userId))
        if (!state) return { delivered: null, read: null }

        return {
            delivered: this.keyOf(state.lastDeliveredMessageId),
            read: this.keyOf(state.lastReadMessageId),
        }
    }

    private key(conversationId: string, userId: string): string {
        return `${conversationId}:${userId}`
    }

    private keyOf(messageId: string | null): MessageKey | null {
        if (!messageId) return null
        const message = this.messages.findById(messageId)
        return message ? { id: message.id, createdAt: message.createdAt } : null
    }

    private compare(a: MessageKey, b: MessageKey): number {
        const byTime = a.createdAt.getTime() - b.createdAt.getTime()
        if (byTime !== 0) return byTime
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    }
}
