import { beforeEach, describe, expect, it } from 'vitest'

import { silentLogger } from '../../../../../tests/doubles/shared/silent-logger'
import { FakeClock, FakeIdGenerator, InMemoryConversationRepository } from '../../../../../tests/doubles/chat'
import { ConversationMother } from '../../../../../tests/mothers/chat'
import { CoachLinkEstablishedIntegrationEvent } from '../../../../shared/integration-events/coach-link-established.integration-event'
import { CreateConversationOnCoachLinkEstablished } from './create-conversation-on-coach-link-established.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

const anEvent = () => new CoachLinkEstablishedIntegrationEvent(COACH, ATHLETE, 'coachy', 'athley')

describe('CreateConversationOnCoachLinkEstablished', () => {
    let conversations: InMemoryConversationRepository
    let handler: CreateConversationOnCoachLinkEstablished

    beforeEach(() => {
        conversations = new InMemoryConversationRepository()
        handler = new CreateConversationOnCoachLinkEstablished(
            conversations,
            new FakeIdGenerator(['conv-new']),
            new FakeClock(),
            silentLogger(),
        )
    })

    it('should_create_the_conversation_for_a_newly_linked_pair', async () => {
        await handler.handle(anEvent())

        const conversation = await conversations.findByPair(COACH, ATHLETE)
        expect(conversation?.id).toBe('conv-new')
    })

    it('should_be_idempotent_when_a_conversation_already_exists_for_the_pair', async () => {
        conversations = new InMemoryConversationRepository([
            ConversationMother.create().withId('conv-existing').between(COACH, ATHLETE).build(),
        ])
        handler = new CreateConversationOnCoachLinkEstablished(
            conversations,
            new FakeIdGenerator(['conv-new']),
            new FakeClock(),
            silentLogger(),
        )

        await handler.handle(anEvent())

        // Re-linking reuses the same thread; no duplicate is created.
        expect(conversations.all()).toHaveLength(1)
        expect(conversations.all()[0]?.id).toBe('conv-existing')
    })
})
