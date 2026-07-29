import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryConversationRepository,
    InMemoryMessageRepository,
    InMemoryParticipantStateRepository,
} from '../../../../../../tests/doubles/chat'
import { ConversationMother } from '../../../../../../tests/mothers/chat'
import { NotYourConversationError } from '../../../domain/errors/chat.errors'
import { DeleteConversationCommand } from './delete-conversation.command'
import { DeleteConversationHandler } from './delete-conversation.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const CONVERSATION = 'conv-1'
const NOW = new Date('2026-02-01T09:00:00.000Z')

describe('DeleteConversationHandler', () => {
    let conversations: InMemoryConversationRepository
    let messages: InMemoryMessageRepository
    let participantStates: InMemoryParticipantStateRepository
    let clock: FakeClock
    let handler: DeleteConversationHandler

    beforeEach(() => {
        conversations = new InMemoryConversationRepository([
            ConversationMother.create().withId(CONVERSATION).between(COACH, ATHLETE).build(),
        ])
        messages = new InMemoryMessageRepository()
        participantStates = new InMemoryParticipantStateRepository(messages)
        clock = new FakeClock(NOW)
        handler = new DeleteConversationHandler(conversations, participantStates, clock)
    })

    it('should_stamp_both_the_hide_and_clear_watermarks_for_the_caller', async () => {
        const applied = await handler.execute(new DeleteConversationCommand(ATHLETE, CONVERSATION))

        expect(applied).toBe(true)
        const state = await participantStates.get(CONVERSATION, ATHLETE)
        expect(state?.hiddenAt).toEqual(NOW)
        expect(state?.clearedAt).toEqual(NOW)
    })

    it('should_only_touch_the_callers_own_state_not_the_counterparts', async () => {
        await handler.execute(new DeleteConversationCommand(ATHLETE, CONVERSATION))

        expect(await participantStates.get(CONVERSATION, COACH)).toBeNull()
    })

    it('should_reject_a_caller_who_is_not_a_participant', async () => {
        await expect(handler.execute(new DeleteConversationCommand('stranger', CONVERSATION))).rejects.toThrow(
            NotYourConversationError,
        )
    })
})
