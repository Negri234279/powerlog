import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ParticipantStateEntity } from '../../../domain/entities/participant-state.entity'
import { ConversationNotFoundError, NotYourConversationError } from '../../../domain/errors/chat.errors'
import { ConversationRepository } from '../../../domain/repositories/conversation.repository'
import { ParticipantStateRepository } from '../../../domain/repositories/participant-state.repository'
import { Clock } from '../../ports/clock.port'
import { ClearConversationCommand } from './clear-conversation.command'

/**
 * "Clear chat" for the caller only: stamps their `cleared_at` watermark to now, so
 * their own message list, inbox preview and unread count all hide everything up to
 * this point. The conversation stays in their inbox and the counterpart's view is
 * untouched — nothing is deleted, it's a per-user filter.
 */
@CommandHandler(ClearConversationCommand)
export class ClearConversationHandler implements ICommandHandler<ClearConversationCommand, boolean> {
    constructor(
        private readonly conversations: ConversationRepository,
        private readonly participantStates: ParticipantStateRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: ClearConversationCommand): Promise<boolean> {
        const conversation = await this.conversations.findById(command.conversationId)
        if (!conversation) {
            throw new ConversationNotFoundError()
        }

        if (!conversation.involves(command.userId)) {
            throw new NotYourConversationError()
        }

        const state =
            (await this.participantStates.get(conversation.id, command.userId)) ??
            ParticipantStateEntity.empty(conversation.id, command.userId)

        state.clear(this.clock.now())
        await this.participantStates.upsert(state)

        return true
    }
}
