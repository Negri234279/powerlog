import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryConversationRepository,
    InMemoryMessageRepository,
    InMemoryParticipantStateRepository,
} from '../../../../../../tests/doubles/chat'
import { ConversationMother, MessageMother } from '../../../../../../tests/mothers/chat'
import { ParticipantStateEntity } from '../../../domain/entities/participant-state.entity'
import { NotYourConversationError } from '../../../domain/errors/chat.errors'
import { ClearConversationCommand } from './clear-conversation.command'
import { ClearConversationHandler } from './clear-conversation.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const CONVERSATION = 'conv-1'
const NOW = new Date('2026-02-01T09:00:00.000Z')

describe('ClearConversationHandler', () => {
    let conversations: InMemoryConversationRepository
    let messages: InMemoryMessageRepository
    let participantStates: InMemoryParticipantStateRepository
    let clock: FakeClock
    let handler: ClearConversationHandler

    beforeEach(() => {
        conversations = new InMemoryConversationRepository([
            ConversationMother.create().withId(CONVERSATION).between(COACH, ATHLETE).build(),
        ])
        messages = new InMemoryMessageRepository()
        participantStates = new InMemoryParticipantStateRepository(messages)
        clock = new FakeClock(NOW)
        handler = new ClearConversationHandler(conversations, participantStates, clock)
    })

    it('should_stamp_the_callers_clear_watermark_without_hiding_the_conversation', async () => {
        const applied = await handler.execute(new ClearConversationCommand(ATHLETE, CONVERSATION))

        expect(applied).toBe(true)
        const state = await participantStates.get(CONVERSATION, ATHLETE)
        expect(state?.clearedAt).toEqual(NOW)
        expect(state?.hiddenAt).toBeNull()
    })

    it('should_only_touch_the_callers_own_state_not_the_counterparts', async () => {
        await handler.execute(new ClearConversationCommand(ATHLETE, CONVERSATION))

        expect(await participantStates.get(CONVERSATION, COACH)).toBeNull()
    })

    it('should_reject_a_caller_who_is_not_a_participant', async () => {
        await expect(handler.execute(new ClearConversationCommand('stranger', CONVERSATION))).rejects.toThrow(
            NotYourConversationError,
        )
    })

    it('should_preserve_the_read_cursor_when_clearing', async () => {
        await messages.create(
            MessageMother.create().withId('m-1').in(CONVERSATION).from(COACH).createdAtTime(NOW).build(),
        )
        const existing = ParticipantStateEntity.empty(CONVERSATION, ATHLETE)
        existing.markRead('m-1', new Date('2026-01-15T00:00:00.000Z'))
        await participantStates.upsert(existing)

        await handler.execute(new ClearConversationCommand(ATHLETE, CONVERSATION))

        const state = await participantStates.get(CONVERSATION, ATHLETE)
        expect(state?.lastReadMessageId).toBe('m-1')
        expect(state?.clearedAt).toEqual(NOW)
    })
})
