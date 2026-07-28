import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs'

import type { MessageEntity } from '../../../domain/entities/message.entity'
import { ConversationNotFoundError, NotYourConversationError } from '../../../domain/errors/chat.errors'
import { ConversationRepository } from '../../../domain/repositories/conversation.repository'
import { MessageRepository } from '../../../domain/repositories/message.repository'
import { ParticipantStateRepository } from '../../../domain/repositories/participant-state.repository'
import { deriveReadStatus, type ReadStatus } from '../../../domain/read-status'
import { decodeChatCursor, encodeChatCursor } from './chat-cursor'
import { ListChatMessagesQuery } from './list-chat-messages.query'

/** One message plus, for the viewer's own messages, its derived double-check. */
export interface ChatMessageView {
    message: MessageEntity
    /** `read`/`delivered`/`sent` for messages the viewer sent; null for received. */
    status: ReadStatus | null
}

/** One keyset page of a conversation's messages, newest first. */
export interface ChatMessagesPage {
    items: ChatMessageView[]
    nextCursor: string | null
    hasNextPage: boolean
}

@QueryHandler(ListChatMessagesQuery)
export class ListChatMessagesHandler implements IQueryHandler<ListChatMessagesQuery, ChatMessagesPage> {
    constructor(
        private readonly conversations: ConversationRepository,
        private readonly messages: MessageRepository,
        private readonly participantStates: ParticipantStateRepository,
    ) {}

    async execute(query: ListChatMessagesQuery): Promise<ChatMessagesPage> {
        const conversation = await this.conversations.findById(query.conversationId)
        if (!conversation) {
            throw new ConversationNotFoundError()
        }

        if (!conversation.involves(query.viewerId)) {
            throw new NotYourConversationError()
        }

        // The double-check on the viewer's outgoing messages is derived from the
        // OTHER participant's cursor.
        const other = conversation.otherParticipant(query.viewerId)!
        const receiver = await this.participantStates.receiverCursor(conversation.id, other)

        const cursor = query.cursor ? decodeChatCursor(query.cursor) : undefined
        const slice = await this.messages.list({ conversationId: conversation.id, limit: query.limit, cursor })

        const items: ChatMessageView[] = slice.items.map((message) => ({
            message,
            status:
                message.senderId === query.viewerId
                    ? deriveReadStatus({ createdAt: message.createdAt, id: message.id }, receiver)
                    : null,
        }))

        const last = items.at(-1)
        const nextCursor =
            slice.hasNextPage && last
                ? encodeChatCursor({ createdAt: last.message.createdAt, id: last.message.id })
                : null

        return {
            items,
            nextCursor,
            hasNextPage: slice.hasNextPage,
        }
    }
}
