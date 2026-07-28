import { ConversationEntity } from '../../../domain/entities/conversation.entity'
import type { chatConversations } from '../schema/chat-conversations.schema'

type ConversationRow = typeof chatConversations.$inferSelect

/** Maps the Conversation entity to/from its `chat_conversations` row. */
export const ConversationMapper = {
    toDomain(row: ConversationRow): ConversationEntity {
        return ConversationEntity.rehydrate({
            id: row.id,
            coachId: row.coachId,
            athleteId: row.athleteId,
            createdAt: row.createdAt,
        })
    },

    toPersistence(conversation: ConversationEntity): typeof chatConversations.$inferInsert {
        return {
            id: conversation.id,
            coachId: conversation.coachId,
            athleteId: conversation.athleteId,
            createdAt: conversation.createdAt,
        }
    },
}
