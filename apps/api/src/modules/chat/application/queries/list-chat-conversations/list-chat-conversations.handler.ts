import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs'

import { PresenceReader, type PresenceSnapshot } from '../../../../../presence/presence-reader'
import { ProfileSnapshotReader } from '../../../../../shared/contracts/profile-snapshot-reader'
import { ChatInboxReadModel, type ChatInboxRow } from '../../ports/chat-inbox.read-model'
import { ListChatConversationsQuery } from './list-chat-conversations.query'

/** The other participant's public identity, for the inbox row. */
export interface ChatParticipantIdentity {
    username: string
    avatarUrl: string | null
}

/** An inbox row enriched with the other participant's presence + identity. */
export interface ChatConversationView extends ChatInboxRow {
    presence: PresenceSnapshot
    otherParticipant: ChatParticipantIdentity
}

@QueryHandler(ListChatConversationsQuery)
export class ListChatConversationsHandler implements IQueryHandler<ListChatConversationsQuery, ChatConversationView[]> {
    constructor(
        private readonly inbox: ChatInboxReadModel,
        private readonly presence: PresenceReader,
        private readonly profiles: ProfileSnapshotReader,
    ) {}

    async execute(query: ListChatConversationsQuery): Promise<ChatConversationView[]> {
        const rows = await this.inbox.listForUser(query.userId)
        const otherIds = rows.map((row) => row.otherParticipantId)

        // One bulk presence read for the whole inbox; profiles resolved per row
        // (bounded — a user has few conversations) so the row can render a name +
        // avatar without a second client round-trip.
        const [snapshots, profiles] = await Promise.all([
            this.presence.snapshotOf(otherIds).catch(() => new Map<string, PresenceSnapshot>()),
            Promise.all(otherIds.map((id) => this.profiles.read(id).catch(() => null))),
        ])

        return rows.map((row, i) => {
            const profile = profiles[i]
            return {
                ...row,
                presence: snapshots.get(row.otherParticipantId) ?? { online: false, lastSeenAt: null },
                otherParticipant: {
                    username: profile?.username ?? '',
                    avatarUrl: profile?.avatarUrl ?? null,
                },
            }
        })
    }
}
