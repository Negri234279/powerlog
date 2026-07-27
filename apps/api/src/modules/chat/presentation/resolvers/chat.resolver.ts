import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { MarkConversationDeliveredCommand } from '../../application/commands/mark-conversation-delivered/mark-conversation-delivered.command'
import { MarkConversationReadCommand } from '../../application/commands/mark-conversation-read/mark-conversation-read.command'
import { SendChatMessageCommand } from '../../application/commands/send-chat-message/send-chat-message.command'
import type { ChatInboxRow } from '../../application/ports/chat-inbox.read-model'
import { ListChatConversationsQuery } from '../../application/queries/list-chat-conversations/list-chat-conversations.query'
import type { ChatMessagesPage } from '../../application/queries/list-chat-messages/list-chat-messages.handler'
import { ListChatMessagesQuery } from '../../application/queries/list-chat-messages/list-chat-messages.query'
import type { MessageEntity } from '../../domain/entities/message.entity'
import { ChatConversationType, ChatMessageType, ChatMessagesPageType, ChatReadStatus } from '../types/chat.type'

const uuidArg = z.string().uuid()
// The domain VO owns the real empty/length rules (trim-aware) so MESSAGE_EMPTY /
// MESSAGE_TOO_LONG stay the stable codes; this is just a hard DoS guard.
const bodyArg = z.string().max(10_000)
const limitArg = z.coerce.number().int().min(1).max(50).optional()
const cursorArg = z.string().min(1).optional()

const DEFAULT_LIMIT = 30

/** Maps a message entity + derived status to its GraphQL view. */
function toMessageView(message: MessageEntity, status: ChatReadStatus | null): ChatMessageType {
    return {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        kind: message.kind,
        body: message.body,
        createdAt: message.createdAt,
        status,
    }
}

function toConversationView(row: ChatInboxRow): ChatConversationType {
    return {
        conversationId: row.conversationId,
        otherParticipantId: row.otherParticipantId,
        lastMessage: row.lastMessage,
        unreadCount: row.unreadCount,
    }
}

@Resolver(() => ChatMessageType)
@UseGuards(JwtCookieGuard)
export class ChatResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => ChatMessagesPageType, {
        description: 'A conversation’s messages, newest first (keyset-paginated).',
    })
    async listChatMessages(
        @CurrentUser() user: AuthUser,
        @Args('conversationId', { type: () => ID }, new ZodValidationPipe(uuidArg)) conversationId: string,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('cursor', { type: () => String, nullable: true }, new ZodValidationPipe(cursorArg)) cursor?: string,
    ): Promise<ChatMessagesPageType> {
        const query = new ListChatMessagesQuery(user.userId, conversationId, limit ?? DEFAULT_LIMIT, cursor)
        const page = await this.queryBus.execute<ListChatMessagesQuery, ChatMessagesPage>(query)

        return {
            items: page.items.map((item) => toMessageView(item.message, item.status as ChatReadStatus | null)),
            nextCursor: page.nextCursor,
            hasNextPage: page.hasNextPage,
        }
    }

    @Query(() => [ChatConversationType], {
        description: 'The caller’s chat inbox: one row per conversation, most recent first.',
    })
    async listChatConversations(@CurrentUser() user: AuthUser): Promise<ChatConversationType[]> {
        const query = new ListChatConversationsQuery(user.userId)
        const rows = await this.queryBus.execute<ListChatConversationsQuery, ChatInboxRow[]>(query)

        return rows.map(toConversationView)
    }

    @Mutation(() => ChatMessageType, { description: 'Send a text message to a conversation.' })
    async sendChatMessage(
        @CurrentUser() user: AuthUser,
        @Args('conversationId', { type: () => ID }, new ZodValidationPipe(uuidArg)) conversationId: string,
        @Args('body', { type: () => String }, new ZodValidationPipe(bodyArg)) body: string,
    ): Promise<ChatMessageType> {
        const command = new SendChatMessageCommand(user.userId, conversationId, body)
        const message = await this.commandBus.execute<SendChatMessageCommand, MessageEntity>(command)

        // Freshly sent: the recipient hasn't received it yet from the sender's view.
        return toMessageView(message, ChatReadStatus.sent)
    }

    @Mutation(() => Boolean, {
        description: 'Advance the caller’s read cursor to the latest message; true if it moved.',
    })
    async markConversationRead(
        @CurrentUser() user: AuthUser,
        @Args('conversationId', { type: () => ID }, new ZodValidationPipe(uuidArg)) conversationId: string,
    ): Promise<boolean> {
        const command = new MarkConversationReadCommand(user.userId, conversationId)

        return this.commandBus.execute<MarkConversationReadCommand, boolean>(command)
    }

    @Mutation(() => Boolean, {
        description: 'Advance the caller’s delivery cursor to the latest message; true if it moved.',
    })
    async markConversationDelivered(
        @CurrentUser() user: AuthUser,
        @Args('conversationId', { type: () => ID }, new ZodValidationPipe(uuidArg)) conversationId: string,
    ): Promise<boolean> {
        const command = new MarkConversationDeliveredCommand(user.userId, conversationId)

        return this.commandBus.execute<MarkConversationDeliveredCommand, boolean>(command)
    }
}
