import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ParticipantStateEntity } from '../../../domain/entities/participant-state.entity'
import { ConversationNotFoundError, NotYourConversationError } from '../../../domain/errors/chat.errors'
import { ConversationRepository } from '../../../domain/repositories/conversation.repository'
import { MessageRepository } from '../../../domain/repositories/message.repository'
import { ParticipantStateRepository } from '../../../domain/repositories/participant-state.repository'
import { ChatPusher } from '../../ports/chat-pusher.port'
import { MarkConversationDeliveredCommand } from './mark-conversation-delivered.command'

/**
 * Advance the caller's delivery cursor to the conversation's latest message —
 * the first check (grey → double grey) once a client has received it, distinct
 * from reading it. Returns true if the cursor moved.
 */
@CommandHandler(MarkConversationDeliveredCommand)
export class MarkConversationDeliveredHandler implements ICommandHandler<MarkConversationDeliveredCommand, boolean> {
    constructor(
        private readonly conversations: ConversationRepository,
        private readonly messages: MessageRepository,
        private readonly participantStates: ParticipantStateRepository,
        private readonly pusher: ChatPusher,
    ) {}

    async execute(command: MarkConversationDeliveredCommand): Promise<boolean> {
        const conversation = await this.conversations.findById(command.conversationId)
        if (!conversation) {
            throw new ConversationNotFoundError()
        }

        if (!conversation.involves(command.userId)) {
            throw new NotYourConversationError()
        }

        const latest = await this.messages.latest(conversation.id)
        if (!latest) return false

        const state =
            (await this.participantStates.get(conversation.id, command.userId)) ??
            ParticipantStateEntity.empty(conversation.id, command.userId)

        if (state.lastDeliveredMessageId === latest.id) return false

        state.markDelivered(latest.id)

        await this.participantStates.upsert(state)

        const other = conversation.otherParticipant(command.userId)
        if (other) {
            await this.pusher.cursorAdvanced({
                conversationId: conversation.id,
                userId: command.userId,
                recipientIds: [other],
                kind: 'delivered',
                messageId: latest.id,
            })
        }

        return true
    }
}
