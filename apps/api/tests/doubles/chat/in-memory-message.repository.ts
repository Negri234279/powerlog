import type { MessageEntity } from '../../../src/modules/chat/domain/entities/message.entity'
import {
    type MessageListFilter,
    type MessageSlice,
    MessageRepository,
} from '../../../src/modules/chat/domain/repositories/message.repository'

/**
 * In-memory MessageRepository implementing the real abstract interface. Mirrors
 * the Drizzle impl's (createdAt, id) DESC keyset ordering.
 */
export class InMemoryMessageRepository extends MessageRepository {
    private readonly items: MessageEntity[] = []

    constructor(seed: MessageEntity[] = []) {
        super()
        this.items.push(...seed)
    }

    async create(message: MessageEntity): Promise<void> {
        this.items.push(message)
    }

    async list(filter: MessageListFilter): Promise<MessageSlice> {
        let ordered = this.orderedDesc(filter.conversationId)

        if (filter.after) {
            // The viewer's "clear chat" watermark: only messages strictly after it.
            const lowerBound = filter.after
            ordered = ordered.filter((m) => m.createdAt.getTime() > lowerBound.getTime())
        }

        const after = filter.cursor
            ? ordered.filter((m) => {
                  const c = filter.cursor!
                  return (
                      m.createdAt.getTime() < c.createdAt.getTime() ||
                      (m.createdAt.getTime() === c.createdAt.getTime() && m.id < c.id)
                  )
              })
            : ordered

        const hasNextPage = after.length > filter.limit
        return { hasNextPage, items: after.slice(0, filter.limit) }
    }

    async latest(conversationId: string): Promise<MessageEntity | null> {
        return this.orderedDesc(conversationId)[0] ?? null
    }

    /** Test inspection: a message by id (used by the participant-state double). */
    findById(id: string): MessageEntity | null {
        return this.items.find((m) => m.id === id) ?? null
    }

    /** Test inspection: every stored message, optionally scoped to a conversation. */
    all(conversationId?: string): MessageEntity[] {
        return conversationId ? this.items.filter((m) => m.conversationId === conversationId) : [...this.items]
    }

    private orderedDesc(conversationId: string): MessageEntity[] {
        return [...this.items]
            .filter((m) => m.conversationId === conversationId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))
    }
}
