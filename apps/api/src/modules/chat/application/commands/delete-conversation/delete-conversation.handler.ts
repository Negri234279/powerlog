import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ParticipantStateEntity } from '../../../domain/entities/participant-state.entity'
import { ConversationNotFoundError, NotYourConversationError } from '../../../domain/errors/chat.errors'
import { ConversationRepository } from '../../../domain/repositories/conversation.repository'
import { ParticipantStateRepository } from '../../../domain/repositories/participant-state.repository'
import { Clock } from '../../ports/clock.port'
import { DeleteConversationCommand } from './delete-conversation.command'

/**
 * "Delete chat" for the caller only: stamps both `cleared_at` and `hidden_at` to
 * now, so the conversation disappears from their inbox and its history is hidden.
 * It's a per-user view change — the counterpart keeps everything, and the row
 * reappears (showing only what's new) the moment a newer message arrives.
 */
@CommandHandler(DeleteConversationCommand)
export class DeleteConversationHandler implements ICommandHandler<DeleteConversationCommand, boolean> {
    constructor(
        private readonly conversations: ConversationRepository,
        private readonly participantStates: ParticipantStateRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: DeleteConversationCommand): Promise<boolean> {
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

        state.hide(this.clock.now())
        await this.participantStates.upsert(state)

        return true
    }
}
