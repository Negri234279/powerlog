import { beforeEach, describe, expect, it } from 'vitest'

import { FakeCoachLinks } from '../../../../../../tests/doubles/shared/fake-coach-links'
import { silentLogger } from '../../../../../../tests/doubles/shared/silent-logger'
import { counterValue, testCounter } from '../../../../../../tests/doubles/shared/test-counter'
import {
    FakeChatPusher,
    FakeClock,
    FakeIdGenerator,
    InMemoryConversationRepository,
    InMemoryMessageRepository,
    InMemoryParticipantStateRepository,
} from '../../../../../../tests/doubles/chat'
import { ConversationMother } from '../../../../../../tests/mothers/chat'
import {
    ConversationNotFoundError,
    ConversationReadOnlyError,
    MessageEmptyError,
    MessageTooLongError,
    NotYourConversationError,
} from '../../../domain/errors/chat.errors'
import { MessageBodyVO } from '../../../domain/value-objects/message-body.vo'
import { SendChatMessageCommand } from './send-chat-message.command'
import { SendChatMessageHandler } from './send-chat-message.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const CONVERSATION = 'conv-1'

describe('SendChatMessageHandler', () => {
    let conversations: InMemoryConversationRepository
    let messages: InMemoryMessageRepository
    let participantStates: InMemoryParticipantStateRepository
    let coachLinks: FakeCoachLinks
    let pusher: FakeChatPusher
    let metrics: ReturnType<typeof testCounter>
    let handler: SendChatMessageHandler

    beforeEach(() => {
        conversations = new InMemoryConversationRepository([
            ConversationMother.create().withId(CONVERSATION).between(COACH, ATHLETE).build(),
        ])
        messages = new InMemoryMessageRepository()
        participantStates = new InMemoryParticipantStateRepository(messages)
        coachLinks = new FakeCoachLinks().link(COACH, ATHLETE)
        pusher = new FakeChatPusher()
        metrics = testCounter(['status'])
        handler = new SendChatMessageHandler(
            conversations,
            messages,
            participantStates,
            coachLinks,
            new FakeIdGenerator(['msg-1']),
            new FakeClock(),
            pusher,
            silentLogger(),
            metrics,
        )
    })

    it('should_persist_a_message_when_the_pair_is_linked', async () => {
        const message = await handler.execute(new SendChatMessageCommand(COACH, CONVERSATION, '  hi there  '))

        expect(await counterValue(metrics, { status: 'sent' })).toBe(1)
        expect(message.id).toBe('msg-1')
        expect(message.senderId).toBe(COACH)
        // Body is trimmed by the domain VO.
        expect(message.body).toBe('hi there')
        expect(messages.all(CONVERSATION)).toHaveLength(1)
    })

    it('should_advance_the_senders_own_read_cursor_to_the_new_message', async () => {
        await handler.execute(new SendChatMessageCommand(COACH, CONVERSATION, 'hi'))

        const state = await participantStates.get(CONVERSATION, COACH)
        expect(state?.lastReadMessageId).toBe('msg-1')
    })

    it('should_request_a_live_push_to_both_participants', async () => {
        await handler.execute(new SendChatMessageCommand(COACH, CONVERSATION, 'hi'))

        expect(pusher.posted).toHaveLength(1)
        expect(pusher.posted[0]?.recipientIds).toEqual([COACH, ATHLETE])
    })

    it('should_block_sending_after_the_pair_is_unlinked', async () => {
        coachLinks.unlink(COACH, ATHLETE)

        await expect(handler.execute(new SendChatMessageCommand(COACH, CONVERSATION, 'hi'))).rejects.toThrow(
            ConversationReadOnlyError,
        )
        expect(messages.all(CONVERSATION)).toHaveLength(0)
        expect(await counterValue(metrics, { status: 'blocked' })).toBe(1)
    })

    it('should_reject_a_message_to_a_missing_conversation', async () => {
        await expect(handler.execute(new SendChatMessageCommand(COACH, 'nope', 'hi'))).rejects.toThrow(
            ConversationNotFoundError,
        )
    })

    it('should_reject_a_sender_who_is_not_a_participant', async () => {
        await expect(handler.execute(new SendChatMessageCommand('stranger', CONVERSATION, 'hi'))).rejects.toThrow(
            NotYourConversationError,
        )
    })

    it('should_reject_an_empty_message', async () => {
        await expect(handler.execute(new SendChatMessageCommand(COACH, CONVERSATION, '   '))).rejects.toThrow(
            MessageEmptyError,
        )
    })

    it('should_reject_a_message_over_the_max_length', async () => {
        const tooLong = 'a'.repeat(MessageBodyVO.MAX_LENGTH + 1)

        await expect(handler.execute(new SendChatMessageCommand(COACH, CONVERSATION, tooLong))).rejects.toThrow(
            MessageTooLongError,
        )
    })
})
