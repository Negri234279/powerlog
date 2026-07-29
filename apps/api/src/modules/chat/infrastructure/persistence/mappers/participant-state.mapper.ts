import { ParticipantStateEntity } from '../../../domain/entities/participant-state.entity'
import type { chatParticipantState } from '../schema/chat-participant-state.schema'

type ParticipantStateRow = typeof chatParticipantState.$inferSelect

/** Maps the ParticipantState entity to/from its `chat_participant_state` row. */
export const ParticipantStateMapper = {
    toDomain(row: ParticipantStateRow): ParticipantStateEntity {
        return ParticipantStateEntity.rehydrate({
            conversationId: row.conversationId,
            userId: row.userId,
            lastDeliveredMessageId: row.lastDeliveredMessageId,
            lastReadMessageId: row.lastReadMessageId,
            lastReadAt: row.lastReadAt,
            clearedAt: row.clearedAt,
            hiddenAt: row.hiddenAt,
        })
    },

    toPersistence(state: ParticipantStateEntity): typeof chatParticipantState.$inferInsert {
        return {
            conversationId: state.conversationId,
            userId: state.userId,
            lastDeliveredMessageId: state.lastDeliveredMessageId,
            lastReadMessageId: state.lastReadMessageId,
            lastReadAt: state.lastReadAt,
            clearedAt: state.clearedAt,
            hiddenAt: state.hiddenAt,
        }
    },
}
