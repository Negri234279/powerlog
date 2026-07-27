import { describe, expect, it } from 'vitest'

import { FakePresenceReader } from '../../../../../../tests/doubles/presence'
import { ChatInboxReadModel, type ChatInboxRow } from '../../ports/chat-inbox.read-model'
import { ListChatConversationsHandler } from './list-chat-conversations.handler'
import { ListChatConversationsQuery } from './list-chat-conversations.query'

const VIEWER = 'coach-1'
const OTHER = 'athlete-1'

function aRow(): ChatInboxRow {
    return { conversationId: 'conv-1', otherParticipantId: OTHER, lastMessage: null, unreadCount: 2 }
}

class StubInbox extends ChatInboxReadModel {
    constructor(private readonly rows: ChatInboxRow[]) {
        super()
    }
    async listForUser(): Promise<ChatInboxRow[]> {
        return this.rows
    }
}

describe('ListChatConversationsHandler', () => {
    it('enriches each row with the other participant’s presence', async () => {
        const presence = new FakePresenceReader().set(OTHER, {
            online: true,
            lastSeenAt: new Date('2026-05-01T10:00:00.000Z'),
        })
        const handler = new ListChatConversationsHandler(new StubInbox([aRow()]), presence)

        const [row] = await handler.execute(new ListChatConversationsQuery(VIEWER))

        expect(row?.unreadCount).toBe(2)
        expect(row?.presence).toEqual({ online: true, lastSeenAt: new Date('2026-05-01T10:00:00.000Z') })
    })

    it('falls back to offline when presence cannot be read', async () => {
        class BrokenPresence extends FakePresenceReader {
            override snapshotOf(): Promise<never> {
                return Promise.reject(new Error('presence down'))
            }
        }
        const handler = new ListChatConversationsHandler(new StubInbox([aRow()]), new BrokenPresence())

        const [row] = await handler.execute(new ListChatConversationsQuery(VIEWER))

        expect(row?.presence).toEqual({ online: false, lastSeenAt: null })
    })
})
