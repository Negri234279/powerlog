import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ParticipantStateEntity } from '../../../domain/entities/participant-state.entity'
import { ConversationNotFoundError, NotYourConversationError } from '../../../domain/errors/chat.errors'
import { ConversationRepository } from '../../../domain/repositories/conversation.repository'
import { MessageRepository } from '../../../domain/repositories/message.repository'
import { ParticipantStateRepository } from '../../../domain/repositories/participant-state.repository'
import { ChatPusher } from '../../ports/chat-pusher.port'
import { Clock } from '../../ports/clock.port'
import { MarkConversationReadCommand } from './mark-conversation-read.command'

/**
 * Advance the caller's read cursor to the conversation's latest message ("read
 * everything up to now"), not per message — that's the whole point of the
 * per-participant cursor. Marking read stays allowed after an unlink: you can
 * still catch up on read-only history. Returns true if the cursor moved.
 */
@CommandHandler(MarkConversationReadCommand)
export class MarkConversationReadHandler implements ICommandHandler<MarkConversationReadCommand, boolean> {
    constructor(
        private readonly conversations: ConversationRepository,
        private readonly messages: MessageRepository,
        private readonly participantStates: ParticipantStateRepository,
        private readonly clock: Clock,
        private readonly pusher: ChatPusher,
    ) {}

    async execute(command: MarkConversationReadCommand): Promise<boolean> {
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

        if (state.lastReadMessageId === latest.id) return false

        const now = this.clock.now()
        state.markRead(latest.id, now)

        await this.participantStates.upsert(state)

        const other = conversation.otherParticipant(command.userId)
        if (other) {
            await this.pusher.cursorAdvanced({
                conversationId: conversation.id,
                userId: command.userId,
                recipientIds: [other],
                kind: 'read',
                messageId: latest.id,
            })
        }

        return true
    }
}
