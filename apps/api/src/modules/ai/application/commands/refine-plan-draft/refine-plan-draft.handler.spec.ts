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
import { AiPlanDraftNotFoundError, AiPlanDraftNotOpenError } from '../../../domain/errors/ai-plan.errors'
import { SetPrescriber } from '../../services/set-prescriber.service'
import { RefinePlanDraftCommand } from './refine-plan-draft.command'
import { RefinePlanDraftHandler } from './refine-plan-draft.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'

/** The mother's context has two sets; a revision must prescribe both. */
const revisedPlan = JSON.stringify({
    rationale: 'Dropped the volume.',
    exercises: [
        {
            entryId: 'entry-1',
            sets: [
                { weightKg: 95, reps: 5, rpe: 7, rir: null, note: null },
                { weightKg: 85, reps: 8, rpe: null, rir: 3, note: null },
            ],
        },
    ],
})

const draftSets = [
    { entryId: 'entry-1', order: 1, plannedWeightKg: 100, plannedReps: 5, rpe: 8, rir: null, notes: null },
    { entryId: 'entry-1', order: 2, plannedWeightKg: 90, plannedReps: 8, rpe: null, rir: 2, notes: null },
]

describe('RefinePlanDraftHandler', () => {
    let drafts: InMemoryAiPlanDraftRepository
    let configs: InMemoryAiProviderConfigRepository
    let openai: StubLlmProviderClient
    let reader: StubSessionPlanContextReader

    const buildHandler = () => {
        reader = new StubSessionPlanContextReader(SessionPlanContextMother.create())

        return new RefinePlanDraftHandler(
            drafts,
            reader,
            new SetPrescriber(configs, new FakeSecretCipher(), stubRegistry(openai), silentLogger()),
            new FakeClock(),
            new FakeIdGenerator('msg'),
        )
    }

    beforeEach(() => {
        drafts = new InMemoryAiPlanDraftRepository()
        configs = new InMemoryAiProviderConfigRepository()
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, model: 'gpt-5', isDefault: true }))
        openai = new StubLlmProviderClient('openai').willAnswer(revisedPlan)
    })

    it('replaces the proposal and records both sides of the exchange', async () => {
        drafts.seed(AiPlanDraftMother.open({ userId: USER_ID, sets: draftSets }))
        const command = new RefinePlanDraftCommand(USER_ID, 'draft-1', 'less volume')

        const view = await buildHandler().execute(command)

        expect(view.sets[0]?.plannedWeightKg).toBe(95)
        expect(view.messages.map((message) => message.role)).toEqual(['assistant', 'user', 'assistant'])
        expect(view.messages.at(-1)?.content).toBe('Dropped the volume.')
    })

    it('shows the model the plan it is being asked to revise', async () => {
        drafts.seed(AiPlanDraftMother.open({ userId: USER_ID, sets: draftSets }))
        const command = new RefinePlanDraftCommand(USER_ID, 'draft-1', 'less volume')

        await buildHandler().execute(command)

        // The draft was never written to the session, so the context alone would
        // show the model empty targets.
        const lastMessage = openai.completeCalls[0]!.messages.at(-1)!.content
        expect(lastMessage).toContain('less volume')
        expect(lastMessage).toContain('"weightKg": 100')
    })

    it('revises a single-exercise draft against that exercise alone', async () => {
        drafts.seed(AiPlanDraftMother.open({ userId: USER_ID, sets: draftSets, entryId: 'entry-1' }))
        const command = new RefinePlanDraftCommand(USER_ID, 'draft-1', 'less volume')

        await buildHandler().execute(command)

        // Widening the scope here would hand the model sets the draft never proposed.
        expect(reader.readCalls).toEqual([{ sessionId: 'session-1', entryId: 'entry-1' }])
    })

    it('records nothing when the model never answers', async () => {
        openai = new StubLlmProviderClient('openai').willAnswer('nonsense', 'still nonsense')
        drafts.seed(AiPlanDraftMother.open({ userId: USER_ID, sets: draftSets }))
        const command = new RefinePlanDraftCommand(USER_ID, 'draft-1', 'less volume')

        await expect(buildHandler().execute(command)).rejects.toThrow()

        // A request that was never acted on leaves no trace.
        expect((await drafts.findById('draft-1'))?.messages).toHaveLength(1)
    })

    it('refuses another user’s draft', async () => {
        drafts.seed(AiPlanDraftMother.open({ userId: '22222222-2222-4222-8222-222222222222', sets: draftSets }))
        const command = new RefinePlanDraftCommand(USER_ID, 'draft-1', 'less volume')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiPlanDraftNotFoundError)
    })

    it('refuses a draft already resolved', async () => {
        const draft = AiPlanDraftMother.open({ userId: USER_ID, sets: draftSets })
        draft.discard(new Date())
        drafts.seed(draft)
        const command = new RefinePlanDraftCommand(USER_ID, 'draft-1', 'less volume')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiPlanDraftNotOpenError)
    })
})
