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
import { silentLogger } from '../../../../../../tests/doubles/shared'
import { AiPlanDraftMother, AiProviderConfigMother, SessionPlanContextMother } from '../../../../../../tests/mothers/ai'
import type { SessionPlanContext } from '../../../../../shared/contracts/session-plan-context'
import {
    EmptySessionPlanError,
    NoDefaultAiProviderError,
    SessionNotProgrammableError,
} from '../../../domain/errors/ai-plan.errors'
import { SetPrescriber } from '../../services/set-prescriber.service'
import { GenerateSessionPlanDraftCommand } from './generate-session-plan-draft.command'
import { GenerateSessionPlanDraftHandler } from './generate-session-plan-draft.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const SESSION_ID = 'session-1'

const validPlan = JSON.stringify({
    rationale: 'Progressed the top set.',
    sets: [
        { setId: 'set-1', weightKg: 102.5, reps: 5, rpe: 8, rir: null, note: null },
        { setId: 'set-2', weightKg: 90, reps: 8, rpe: null, rir: 2, note: null },
    ],
})

describe('GenerateSessionPlanDraftHandler', () => {
    let drafts: InMemoryAiPlanDraftRepository
    let configs: InMemoryAiProviderConfigRepository
    let openai: StubLlmProviderClient

    const buildHandler = (context: SessionPlanContext | null = SessionPlanContextMother.create()) =>
        new GenerateSessionPlanDraftHandler(
            drafts,
            new StubSessionPlanContextReader(context),
            new SetPrescriber(configs, new FakeSecretCipher(), stubRegistry(openai), silentLogger()),
            new FakeClock(),
            new FakeIdGenerator('draft'),
            silentLogger(),
        )

    beforeEach(() => {
        drafts = new InMemoryAiPlanDraftRepository()
        configs = new InMemoryAiProviderConfigRepository()
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, model: 'gpt-5', isDefault: true }))
        openai = new StubLlmProviderClient('openai').willAnswer(validPlan)
    })

    it('drafts a plan for every set of the session', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        const view = await buildHandler().execute(command)

        expect(view.status).toBe('open')
        expect(view.sets.map((set) => set.setId)).toEqual(['set-1', 'set-2'])
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

    it('refuses a session with no sets to prescribe', async () => {
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        await expect(buildHandler(SessionPlanContextMother.withoutSets()).execute(command)).rejects.toThrow(
            EmptySessionPlanError,
        )
        expect(openai.completeCalls).toEqual([])
    })

    it('stores nothing when the model never returns a usable plan', async () => {
        openai = new StubLlmProviderClient('openai').willAnswer('nonsense', 'still nonsense')
        const command = new GenerateSessionPlanDraftCommand(USER_ID, SESSION_ID)

        await expect(buildHandler().execute(command)).rejects.toThrow()
        expect(drafts.all()).toEqual([])
    })
})
