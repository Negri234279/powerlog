import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs'

import { ChatInboxReadModel, type ChatInboxRow } from '../../ports/chat-inbox.read-model'
import { ListChatConversationsQuery } from './list-chat-conversations.query'

@QueryHandler(ListChatConversationsQuery)
export class ListChatConversationsHandler implements IQueryHandler<ListChatConversationsQuery, ChatInboxRow[]> {
    constructor(private readonly inbox: ChatInboxReadModel) {}

    async execute(query: ListChatConversationsQuery): Promise<ChatInboxRow[]> {
        return this.inbox.listForUser(query.userId)
    }
}
