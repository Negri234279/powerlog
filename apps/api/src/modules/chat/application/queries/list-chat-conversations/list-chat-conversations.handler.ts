import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs'

import { PresenceReader, type PresenceSnapshot } from '../../../../../presence/presence-reader'
import { ChatInboxReadModel, type ChatInboxRow } from '../../ports/chat-inbox.read-model'
import { ListChatConversationsQuery } from './list-chat-conversations.query'

/** An inbox row enriched with the other participant's live presence. */
export interface ChatConversationView extends ChatInboxRow {
    presence: PresenceSnapshot
}

@QueryHandler(ListChatConversationsQuery)
export class ListChatConversationsHandler implements IQueryHandler<ListChatConversationsQuery, ChatConversationView[]> {
    constructor(
        private readonly inbox: ChatInboxReadModel,
        private readonly presence: PresenceReader,
    ) {}

    async execute(query: ListChatConversationsQuery): Promise<ChatConversationView[]> {
        const rows = await this.inbox.listForUser(query.userId)

        // One bulk presence read for the whole inbox (online set + last-seen).
        const snapshots = await this.presence
            .snapshotOf(rows.map((row) => row.otherParticipantId))
            .catch(() => new Map<string, PresenceSnapshot>())

        return rows.map((row) => ({
            ...row,
            presence: snapshots.get(row.otherParticipantId) ?? { online: false, lastSeenAt: null },
        }))
    }
}
