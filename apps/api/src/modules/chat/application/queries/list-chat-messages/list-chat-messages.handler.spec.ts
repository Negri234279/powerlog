import { beforeEach, describe, expect, it } from 'vitest'

import {
    InMemoryConversationRepository,
    InMemoryMessageRepository,
    InMemoryParticipantStateRepository,
} from '../../../../../../tests/doubles/chat'
import { ConversationMother, MessageMother } from '../../../../../../tests/mothers/chat'
import { ParticipantStateEntity } from '../../../domain/entities/participant-state.entity'
import { NotYourConversationError } from '../../../domain/errors/chat.errors'
import { ListChatMessagesHandler } from './list-chat-messages.handler'
import { ListChatMessagesQuery } from './list-chat-messages.query'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const CONVERSATION = 'conv-1'

describe('ListChatMessagesHandler', () => {
    let conversations: InMemoryConversationRepository
    let messages: InMemoryMessageRepository
    let participantStates: InMemoryParticipantStateRepository
    let handler: ListChatMessagesHandler

    beforeEach(() => {
        conversations = new InMemoryConversationRepository([
            ConversationMother.create().withId(CONVERSATION).between(COACH, ATHLETE).build(),
        ])
        messages = new InMemoryMessageRepository()
        participantStates = new InMemoryParticipantStateRepository(messages)
        handler = new ListChatMessagesHandler(conversations, messages, participantStates)
    })

    const seed = (id: string, from: string, at: string) =>
        messages.create(
            MessageMother.create().withId(id).in(CONVERSATION).from(from).createdAtTime(new Date(at)).build(),
        )

    it('should_paginate_by_cursor_newest_first', async () => {
        await seed('m-1', COACH, '2026-01-01T10:00:00Z')
        await seed('m-2', COACH, '2026-01-01T10:01:00Z')
        await seed('m-3', COACH, '2026-01-01T10:02:00Z')

        const first = await handler.execute(new ListChatMessagesQuery(COACH, CONVERSATION, 2))
        expect(first.items.map((i) => i.message.id)).toEqual(['m-3', 'm-2'])
        expect(first.hasNextPage).toBe(true)
        expect(first.nextCursor).not.toBeNull()

        const second = await handler.execute(new ListChatMessagesQuery(COACH, CONVERSATION, 2, first.nextCursor!))
        expect(second.items.map((i) => i.message.id)).toEqual(['m-1'])
        expect(second.hasNextPage).toBe(false)
        expect(second.nextCursor).toBeNull()
    })

    it('should_derive_the_double_check_for_the_viewers_own_messages_from_the_other_cursor', async () => {
        await seed('m-1', COACH, '2026-01-01T10:00:00Z')
        await seed('m-2', COACH, '2026-01-01T10:01:00Z')
        // The athlete has read up to m-1 only.
        const athleteState = ParticipantStateEntity.rehydrate({
            conversationId: CONVERSATION,
            userId: ATHLETE,
            lastDeliveredMessageId: 'm-2',
            lastReadMessageId: 'm-1',
            lastReadAt: new Date('2026-01-01T10:00:30Z'),
        })
        await participantStates.upsert(athleteState)

        const page = await handler.execute(new ListChatMessagesQuery(COACH, CONVERSATION, 10))
        const byId = new Map(page.items.map((i) => [i.message.id, i.status]))

        expect(byId.get('m-1')).toBe('read')
        expect(byId.get('m-2')).toBe('delivered')
    })

    it('should_not_derive_a_status_for_messages_the_viewer_received', async () => {
        await seed('m-1', ATHLETE, '2026-01-01T10:00:00Z')

        const page = await handler.execute(new ListChatMessagesQuery(COACH, CONVERSATION, 10))

        expect(page.items[0]?.status).toBeNull()
    })

    it('should_reject_a_viewer_who_is_not_a_participant', async () => {
        await expect(handler.execute(new ListChatMessagesQuery('stranger', CONVERSATION, 10))).rejects.toThrow(
            NotYourConversationError,
        )
    })
})
