import { MessageEntity } from '../../../domain/entities/message.entity'
import type { chatMessages } from '../schema/chat-messages.schema'

type MessageRow = typeof chatMessages.$inferSelect

/** Maps the Message entity to/from its `chat_messages` row (v1: text only). */
export const MessageMapper = {
    toDomain(row: MessageRow): MessageEntity {
        return MessageEntity.rehydrate({
            id: row.id,
            conversationId: row.conversationId,
            senderId: row.senderId,
            kind: row.kind,
            body: row.body,
            createdAt: row.createdAt,
        })
    },

    toPersistence(message: MessageEntity): typeof chatMessages.$inferInsert {
        return {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            kind: message.kind,
            body: message.body,
            createdAt: message.createdAt,
        }
    },
}
