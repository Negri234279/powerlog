import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeIdGenerator,
    FakeSecretCipher,
    InMemoryAiPlanDraftRepository,
    InMemoryAiProviderConfigRepository,
    StubLlmProviderClient,
    StubSessionPlanContextReader,
    stubRegistry,
} from '../../../../../../tests/doubles/ai'
import { FakeEntitlements, RecordingEventBus, silentLogger } from '../../../../../../tests/doubles/shared'
import { FeatureNotInPlanError } from '../../../../../shared/contracts/entitlements'
import { AiPlanDraftMother, AiProviderConfigMother, SessionPlanContextMother } from '../../../../../../tests/mothers/ai'
import type { SessionPlanContext } from '../../../../../shared/contracts/session-plan-context'
import { NoDefaultAiProviderError, SessionNotProgrammableError } from '../../../domain/errors/ai-plan.errors'
import { AiConversation } from '../../services/ai-conversation.service'
import { AiProviderResolver } from '../../services/ai-provider-resolver.service'
import { SetPrescriber } from '../../services/set-prescriber.service'
import { GenerateSessionPlanDraftCommand } from './generate-session-plan-draft.command'
import { GenerateSessionPlanDraftHandler } from './generate-session-plan-draft.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const SESSION_ID = 'session-1'

const validPlan = JSON.stringify({
    rationale: 'Progressed the top set.',
    exercises: [
        {
            entryId: 'entry-1',
            sets: [
                { weightKg: 102.5, reps: 5, rpe: 8, rir: null, note: null },
                { weightKg: 90, reps: 8, rpe: null, rir: 2, note: null },
                { weightKg: 90, reps: 8, rpe: null, rir: 2, note: null },
            ],
        },
    ],
})

describe('GenerateSessionPlanDraftHandler', () => {
    let drafts: InMemoryAiPlanDraftRepository
    let configs: InMemoryAiProviderConfigRepository
    let openai: StubLlmProviderClient
    let reader: StubSessionPlanContextReader
    let entitlements: FakeEntitlements

    const buildHandler = (context: SessionPlanContext | null = SessionPlanContextMother.create()) => {
        reader = new StubSessionPlanContextReader(context)

        return new GenerateSessionPlanDraftHandler(
            drafts,
            reader,
            new SetPrescriber(
                new AiProviderResolver(configs),
                new AiConversation(
                    new FakeSecretCipher(),
                    stubRegistry(openai),
                    silentLogger(),
                    new RecordingEventBus().asEventBus(),
                ),
            ),
            entitlements,
            new FakeClock(),
            new FakeIdGenerator('draft'),
            silentLogger(),
        )
    }

    beforeEach(() => {
        drafts = new InMemoryAiPlanDraftRepository()
        configs = new InMemoryAiProviderConfigRepository()
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, model: 'gpt-5', isDefault: true }))
        openai = new StubLlmProviderClient('openai').willAnswer(validPlan)
        entitlements = new FakeEntitlements()
    })

    it('drafts a plan for every exercise, with the set count the model chose', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        const view = await buildHandler().execute(command)

        expect(view.status).toBe('open')
        // The session had two sets; the model proposed three. That is the feature.
        expect(view.sets.map((set) => [set.entryId, set.order])).toEqual([
            ['entry-1', 1],
            ['entry-1', 2],
            ['entry-1', 3],
        ])
        expect(view.messages[0]?.content).toBe('Progressed the top set.')
    })

    it('records which provider and model produced it', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        const view = await buildHandler().execute(command)

        expect(view.provider).toBe('openai')
        expect(view.model).toBe('gpt-5')
    })

    it('supersedes the session’s previous open draft', async () => {
        drafts.seed(AiPlanDraftMother.open({ id: 'old-draft', userId: USER_ID, sessionId: SESSION_ID }))
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        await buildHandler().execute(command)

        // A session holds one proposal at a time.
        expect((await drafts.findById('old-draft'))?.status.value).toBe('discarded')
        expect(await drafts.findOpenBySession(USER_ID, SESSION_ID)).not.toBeNull()
    })

    it('narrows the context to one exercise when asked, and remembers the scope', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID, 'entry-1')

        const view = await buildHandler().execute(command)

        // Workouts must not gather history for exercises nobody asked about.
        expect(reader.readCalls).toEqual([{ sessionId: SESSION_ID, entryId: 'entry-1' }])
        // Stored so a later refinement keeps the same scope.
        expect(view.entryId).toBe('entry-1')
    })

    it('takes the whole session when no exercise is named', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        const view = await buildHandler().execute(command)

        expect(reader.readCalls).toEqual([{ sessionId: SESSION_ID }])
        expect(view.entryId).toBeNull()
    })

    it('refuses an exercise that is not in the session', async () => {
        // Filtered out upstream, so the context comes back with no exercises.
        const empty = { ...SessionPlanContextMother.create(), exercises: [] }
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID, 'entry-nope')

        await expect(buildHandler(empty).execute(command)).rejects.toThrow(SessionNotProgrammableError)
        expect(openai.completeCalls).toEqual([])
    })

    it('sends the athlete’s extra info to the model and keeps it in the thread', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID, null, 'shoulder is sore')

        const view = await buildHandler().execute(command)

        expect(openai.completeCalls[0]?.messages[0]?.content).toContain('shoulder is sore')
        expect(view.messages[0]).toMatchObject({ role: 'user', content: 'shoulder is sore' })
        expect(view.messages[1]?.role).toBe('assistant')
    })

    it('opens the thread with the model’s rationale when nothing extra was said', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        const view = await buildHandler().execute(command)

        expect(view.messages).toHaveLength(1)
        expect(view.messages[0]?.role).toBe('assistant')
    })

    it('fails before calling the provider when no default key is set', async () => {
        configs = new InMemoryAiProviderConfigRepository()
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        await expect(buildHandler().execute(command)).rejects.toThrow(NoDefaultAiProviderError)
        expect(openai.completeCalls).toEqual([])
    })

    it('refuses a session that cannot be programmed', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        await expect(buildHandler(null).execute(command)).rejects.toThrow(SessionNotProgrammableError)
        expect(openai.completeCalls).toEqual([])
    })

    it('programs an exercise that has no sets yet — the model proposes the scheme', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        const view = await buildHandler(SessionPlanContextMother.withoutSets()).execute(command)

        // The athlete only picked the exercise; the AI decided on three sets.
        expect(view.sets).toHaveLength(3)
        expect(openai.completeCalls).toHaveLength(1)
    })

    it('stores nothing when the model never returns a usable plan', async () => {
        openai = new StubLlmProviderClient('openai').willAnswer('nonsense', 'still nonsense')
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        await expect(buildHandler().execute(command)).rejects.toThrow()
        expect(drafts.all()).toEqual([])
    })

    it('refuses on a plan without AI, without calling the provider', async () => {
        // The key is the user's own, so a call would cost US nothing — but it would
        // cost THEM, and the plan already said no. The gate runs before the provider.
        entitlements.on({ plan: 'athlete-free', ai: false })
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        await expect(buildHandler().execute(command)).rejects.toBeInstanceOf(FeatureNotInPlanError)
        expect(openai.completeCalls).toHaveLength(0)
        expect(drafts.all()).toEqual([])
    })
})
