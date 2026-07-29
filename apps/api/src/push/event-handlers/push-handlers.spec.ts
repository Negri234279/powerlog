import { beforeEach, describe, expect, it } from 'vitest'

import { FakePushNotifier } from '../../../tests/doubles/push'
import { FakeUserDirectory } from '../../../tests/doubles/shared/fake-user-directory'
import { InMemoryOnlineRegistry } from '../../presence/online/in-memory-online-registry'
import { AiGenerationSettledIntegrationEvent } from '../../shared/integration-events/ai-generation-settled.integration-event'
import { ChatMessageSentIntegrationEvent } from '../../shared/integration-events/chat-message-sent.integration-event'
import { CoachInvitationCreatedIntegrationEvent } from '../../shared/integration-events/coach-invitation-created.integration-event'
import { MesocycleAssignedIntegrationEvent } from '../../shared/integration-events/mesocycle-assigned.integration-event'
import { WorkoutSessionPlannedIntegrationEvent } from '../../shared/integration-events/workout-session-planned.integration-event'
import { PushOnAiGenerationSettled } from './push-on-ai-generation-settled.handler'
import { PushOnChatMessage } from './push-on-chat-message.handler'
import { PushOnCoachInvitation } from './push-on-coach-invitation.handler'
import { PushOnMesocycleAssigned } from './push-on-mesocycle-assigned.handler'
import { PushOnSessionPlanned } from './push-on-session-planned.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

describe('Push event handlers', () => {
    let push: FakePushNotifier
    let users: FakeUserDirectory

    beforeEach(() => {
        push = new FakePushNotifier()
        users = new FakeUserDirectory().seed(COACH, { email: 'coach@x.com', username: 'coachy' })
    })

    describe('PushOnSessionPlanned', () => {
        it('pushes the athlete, localized per device', async () => {
            const handler = new PushOnSessionPlanned(push, users)

            await handler.handle(new WorkoutSessionPlannedIntegrationEvent(COACH, ATHLETE, 'sess-1', new Date()))

            expect(push.sends[0]?.userIds).toEqual([ATHLETE])
            expect(push.render(0, 'es').body).toBe('@coachy te ha programado una sesión')
            expect(push.render(0, 'en').body).toBe('@coachy planned a session for you')
            expect(push.render(0, 'en').url).toBe('/workouts')
        })
    })

    describe('PushOnMesocycleAssigned', () => {
        it('pushes the athlete with the block name', async () => {
            const handler = new PushOnMesocycleAssigned(push, users)

            await handler.handle(new MesocycleAssignedIntegrationEvent(COACH, ATHLETE, 'meso-1', 'Peaking'))

            expect(push.sends[0]?.userIds).toEqual([ATHLETE])
            expect(push.render(0, 'es').body).toContain('Peaking')
            expect(push.render(0, 'en').url).toBe('/workouts/mesocycles')
        })
    })

    describe('PushOnCoachInvitation', () => {
        it('pushes an invited user who already has an account', async () => {
            const handler = new PushOnCoachInvitation(push)

            await handler.handle(
                new CoachInvitationCreatedIntegrationEvent('inv-1', COACH, ATHLETE, 'a@x.com', 'coachy', 'tok'),
            )

            expect(push.sends[0]?.userIds).toEqual([ATHLETE])
            expect(push.render(0, 'es').body).toContain('coachy')
        })

        it('does not push when the invited email has no account yet', async () => {
            const handler = new PushOnCoachInvitation(push)

            await handler.handle(
                new CoachInvitationCreatedIntegrationEvent('inv-1', COACH, null, 'a@x.com', 'coachy', 'tok'),
            )

            expect(push.sends).toHaveLength(0)
        })
    })

    describe('PushOnAiGenerationSettled', () => {
        it('pushes the owner and deep-links a finished session plan to its draft', async () => {
            const handler = new PushOnAiGenerationSettled(push)

            await handler.handle(
                new AiGenerationSettledIntegrationEvent(ATHLETE, 'gen-1', 'session_plan', 'succeeded', 'draft-9'),
            )

            expect(push.sends[0]?.userIds).toEqual([ATHLETE])
            expect(push.render(0, 'en').url).toBe('/workouts/ai/draft-9')
        })

        it('lands other kinds on the AI drafts page', async () => {
            const handler = new PushOnAiGenerationSettled(push)

            await handler.handle(
                new AiGenerationSettledIntegrationEvent(ATHLETE, 'gen-1', 'mesocycle', 'succeeded', 'draft-9'),
            )

            expect(push.render(0, 'en').url).toBe('/workouts/ai')
        })

        it('does not push a failed generation', async () => {
            const handler = new PushOnAiGenerationSettled(push)

            await handler.handle(
                new AiGenerationSettledIntegrationEvent(ATHLETE, 'gen-1', 'session_plan', 'failed', null),
            )

            expect(push.sends).toHaveLength(0)
        })
    })

    describe('PushOnChatMessage', () => {
        let online: InMemoryOnlineRegistry

        beforeEach(() => {
            online = new InMemoryOnlineRegistry()
            users.seed(ATHLETE, { email: 'ath@x.com', username: 'athy' })
        })

        it('pushes the recipient when they are offline, with a preview and their side’s link', async () => {
            const handler = new PushOnChatMessage(push, online, users)

            // Coach sent; the athlete is the offline recipient.
            await handler.handle(new ChatMessageSentIntegrationEvent('conv-1', COACH, ATHLETE, COACH, 'hey there'))

            expect(push.sends[0]?.userIds).toEqual([ATHLETE])
            const payload = push.render(0, 'en')
            expect(payload.title).toBe('@coachy')
            expect(payload.body).toBe('hey there')
            expect(payload.url).toBe(`/coaching/coaches/${COACH}`)
            expect(payload.tag).toBe('chat-conv-1')
        })

        it('links a coach recipient to the athlete’s side', async () => {
            const handler = new PushOnChatMessage(push, online, users)

            // Athlete sent; the coach is the offline recipient.
            await handler.handle(new ChatMessageSentIntegrationEvent('conv-1', COACH, ATHLETE, ATHLETE, 'yo'))

            expect(push.sends[0]?.userIds).toEqual([COACH])
            expect(push.render(0, 'en').url).toBe(`/coaching/athletes/${ATHLETE}`)
        })

        it('does not push when the recipient is online (they see it live)', async () => {
            await online.connect(ATHLETE)
            const handler = new PushOnChatMessage(push, online, users)

            await handler.handle(new ChatMessageSentIntegrationEvent('conv-1', COACH, ATHLETE, COACH, 'hey'))

            expect(push.sends).toHaveLength(0)
        })
    })
})
