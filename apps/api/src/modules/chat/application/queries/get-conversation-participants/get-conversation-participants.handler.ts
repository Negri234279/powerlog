import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs'

import { ConversationNotFoundError, NotYourConversationError } from '../../../domain/errors/chat.errors'
import { ConversationRepository } from '../../../domain/repositories/conversation.repository'
import { GetConversationParticipantsQuery } from './get-conversation-participants.query'

/** The two participants of a conversation plus the viewer's counterpart. */
export interface ConversationParticipants {
    coachId: string
    athleteId: string
    /** The participant who is NOT the viewer (the one to fan events out to). */
    otherParticipantId: string
}

@QueryHandler(GetConversationParticipantsQuery)
export class GetConversationParticipantsHandler implements IQueryHandler<
    GetConversationParticipantsQuery,
    ConversationParticipants
> {
    constructor(private readonly conversations: ConversationRepository) {}

    async execute(query: GetConversationParticipantsQuery): Promise<ConversationParticipants> {
        const conversation = await this.conversations.findById(query.conversationId)
        if (!conversation) throw new ConversationNotFoundError()

        const other = conversation.otherParticipant(query.viewerId)
        if (!other) throw new NotYourConversationError()

        return { coachId: conversation.coachId, athleteId: conversation.athleteId, otherParticipantId: other }
    }
}
