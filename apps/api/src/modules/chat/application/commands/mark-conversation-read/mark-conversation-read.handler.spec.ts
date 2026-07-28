import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeChatPusher,
    FakeClock,
    InMemoryConversationRepository,
    InMemoryMessageRepository,
    InMemoryParticipantStateRepository,
} from '../../../../../../tests/doubles/chat'
import { ConversationMother, MessageMother } from '../../../../../../tests/mothers/chat'
import { NotYourConversationError } from '../../../domain/errors/chat.errors'
import { MarkConversationReadCommand } from './mark-conversation-read.command'
import { MarkConversationReadHandler } from './mark-conversation-read.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const CONVERSATION = 'conv-1'

describe('MarkConversationReadHandler', () => {
    let conversations: InMemoryConversationRepository
    let messages: InMemoryMessageRepository
    let participantStates: InMemoryParticipantStateRepository
    let pusher: FakeChatPusher
    let handler: MarkConversationReadHandler

    beforeEach(() => {
        conversations = new InMemoryConversationRepository([
            ConversationMother.create().withId(CONVERSATION).between(COACH, ATHLETE).build(),
        ])
        messages = new InMemoryMessageRepository()
        participantStates = new InMemoryParticipantStateRepository(messages)
        pusher = new FakeChatPusher()
        handler = new MarkConversationReadHandler(conversations, messages, participantStates, new FakeClock(), pusher)
    })

    const seedMessage = (id: string, at: string) =>
        messages.create(
            MessageMother.create().withId(id).in(CONVERSATION).from(COACH).createdAtTime(new Date(at)).build(),
        )

    it('should_advance_the_read_cursor_to_the_latest_message', async () => {
        await seedMessage('m-1', '2026-01-01T10:00:00Z')
        await seedMessage('m-2', '2026-01-01T10:01:00Z')

        const moved = await handler.execute(new MarkConversationReadCommand(ATHLETE, CONVERSATION))

        expect(moved).toBe(true)
        const state = await participantStates.get(CONVERSATION, ATHLETE)
        expect(state?.lastReadMessageId).toBe('m-2')
    })

    it('should_notify_the_other_participant_that_the_cursor_moved', async () => {
        await seedMessage('m-1', '2026-01-01T10:00:00Z')

        await handler.execute(new MarkConversationReadCommand(ATHLETE, CONVERSATION))

        expect(pusher.cursors).toHaveLength(1)
        expect(pusher.cursors[0]).toMatchObject({ kind: 'read', recipientIds: [COACH], messageId: 'm-1' })
    })

    it('should_be_a_noop_when_there_are_no_messages', async () => {
        const moved = await handler.execute(new MarkConversationReadCommand(ATHLETE, CONVERSATION))

        expect(moved).toBe(false)
        expect(pusher.cursors).toHaveLength(0)
    })

    it('should_be_a_noop_when_already_at_the_latest_message', async () => {
        await seedMessage('m-1', '2026-01-01T10:00:00Z')
        await handler.execute(new MarkConversationReadCommand(ATHLETE, CONVERSATION))

        const moved = await handler.execute(new MarkConversationReadCommand(ATHLETE, CONVERSATION))

        expect(moved).toBe(false)
    })

    it('should_reject_a_viewer_who_is_not_a_participant', async () => {
        await seedMessage('m-1', '2026-01-01T10:00:00Z')

        await expect(handler.execute(new MarkConversationReadCommand('stranger', CONVERSATION))).rejects.toThrow(
            NotYourConversationError,
        )
    })
})
