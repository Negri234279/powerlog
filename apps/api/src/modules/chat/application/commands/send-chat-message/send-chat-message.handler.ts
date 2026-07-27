import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { PinoLogger } from 'nestjs-pino'
import type { Counter } from 'prom-client'

import { METRIC } from '../../../../../observability/metrics'
import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { MessageEntity } from '../../../domain/entities/message.entity'
import { ParticipantStateEntity } from '../../../domain/entities/participant-state.entity'
import {
    ConversationNotFoundError,
    ConversationReadOnlyError,
    NotYourConversationError,
} from '../../../domain/errors/chat.errors'
import { ConversationRepository } from '../../../domain/repositories/conversation.repository'
import { MessageRepository } from '../../../domain/repositories/message.repository'
import { ParticipantStateRepository } from '../../../domain/repositories/participant-state.repository'
import { ChatPusher } from '../../ports/chat-pusher.port'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { SendChatMessageCommand } from './send-chat-message.command'

/**
 * The single write path for sending a message — GraphQL today, the WS gateway in
 * Chat.2 both dispatch this. Authorizes the sender against the conversation and
 * re-checks the live link on every send (a broken link is read-only), persists,
 * advances the sender's own read cursor (you've read what you just wrote) and
 * pushes best-effort.
 */
@CommandHandler(SendChatMessageCommand)
export class SendChatMessageHandler implements ICommandHandler<SendChatMessageCommand, MessageEntity> {
    constructor(
        private readonly conversations: ConversationRepository,
        private readonly messages: MessageRepository,
        private readonly participantStates: ParticipantStateRepository,
        private readonly coachLinks: CoachLinks,
        private readonly ids: IdGenerator,
        private readonly clock: Clock,
        private readonly pusher: ChatPusher,
        private readonly logger: PinoLogger,
        @InjectMetric(METRIC.chatMessages) private readonly messagesSent: Counter<string>,
    ) {
        this.logger.setContext(SendChatMessageHandler.name)
    }

    async execute(command: SendChatMessageCommand): Promise<MessageEntity> {
        const conversation = await this.conversations.findById(command.conversationId)
        if (!conversation) {
            throw new ConversationNotFoundError()
        }

        if (!conversation.involves(command.senderId)) {
            throw new NotYourConversationError()
        }

        // Writing requires a live link — history stays readable after unlink, but
        // nobody can send. The conversation never caches this; it's checked here.
        const linked = await this.coachLinks.areLinked(conversation.coachId, conversation.athleteId)
        if (!linked) {
            this.messagesSent.inc({ status: 'blocked' })
            throw new ConversationReadOnlyError()
        }

        const now = this.clock.now()
        const message = MessageEntity.create({
            id: this.ids.uuid(),
            conversationId: conversation.id,
            senderId: command.senderId,
            body: command.body,
            now,
        })

        await this.messages.create(message)

        // The sender has, by definition, read their own latest message.
        const senderState =
            (await this.participantStates.get(conversation.id, command.senderId)) ??
            ParticipantStateEntity.empty(conversation.id, command.senderId)

        senderState.markRead(message.id, now)

        await this.participantStates.upsert(senderState)

        this.messagesSent.inc({ status: 'sent' })
        this.logger.info({ conversationId: conversation.id }, 'chat message sent')

        // Best-effort live fan-out; a push failure never fails the send (GraphQL is
        // the fallback when a socket isn't connected). No-op until Chat.2.
        await this.pusher.messagePosted({
            conversationId: conversation.id,
            recipientIds: [conversation.coachId, conversation.athleteId],
            message,
        })

        return message
    }
}
