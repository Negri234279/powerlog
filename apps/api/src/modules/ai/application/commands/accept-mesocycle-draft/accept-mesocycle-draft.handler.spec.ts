import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryAiMesocycleDraftRepository,
    RecordingAiGenerationMetrics,
} from '../../../../../../tests/doubles/ai'
import { silentLogger } from '../../../../../../tests/doubles/shared'
import {
    AI_MESOCYCLE_DRAFT_DEFAULTS,
    AiMesocycleDraftMother,
    mesocycleDraftProposal,
} from '../../../../../../tests/mothers/ai'
import { AiMesocycleDraftNotFoundError } from '../../../domain/errors/ai-mesocycle.errors'
import { AcceptMesocycleDraftCommand } from './accept-mesocycle-draft.command'
import { AcceptMesocycleDraftHandler } from './accept-mesocycle-draft.handler'

const USER_ID = AI_MESOCYCLE_DRAFT_DEFAULTS.userId

describe('AcceptMesocycleDraftHandler', () => {
    let drafts: InMemoryAiMesocycleDraftRepository
    let metrics: RecordingAiGenerationMetrics

    const buildHandler = () => new AcceptMesocycleDraftHandler(drafts, new FakeClock(), metrics, silentLogger())

    beforeEach(() => {
        drafts = new InMemoryAiMesocycleDraftRepository()
        metrics = new RecordingAiGenerationMetrics()
    })

    it('marks the draft accepted and records the outcome', async () => {
        drafts.seed(AiMesocycleDraftMother.open())
        const command = new AcceptMesocycleDraftCommand(USER_ID, 'draft-1')

        const view = await buildHandler().execute(command)

        expect(view.status).toBe('accepted')
        expect(metrics.draftsSettled).toEqual([{ kind: 'mesocycle', outcome: 'accepted', model: 'gpt-5' }])
        // Born with one rationale, never refined: zero rounds.
        expect(metrics.refinementsBeforeAccept).toEqual([{ kind: 'mesocycle', model: 'gpt-5', count: 0 }])
    })

    it('counts the refinement rounds the thread went through', async () => {
        const draft = AiMesocycleDraftMother.open()
        // Two revisions → two extra assistant rationales → two refinement rounds.
        draft.revise(mesocycleDraftProposal(), { rationaleId: 'r-1', rationale: 'More volume.' }, new Date())
        draft.revise(mesocycleDraftProposal(), { rationaleId: 'r-2', rationale: 'Added a back-off.' }, new Date())
        drafts.seed(draft)
        const command = new AcceptMesocycleDraftCommand(USER_ID, 'draft-1')

        await buildHandler().execute(command)

        expect(metrics.refinementsBeforeAccept).toEqual([{ kind: 'mesocycle', model: 'gpt-5', count: 2 }])
    })

    it('refuses another user’s draft and records nothing', async () => {
        drafts.seed(AiMesocycleDraftMother.open({ userId: '22222222-2222-4222-8222-222222222222' }))
        const command = new AcceptMesocycleDraftCommand(USER_ID, 'draft-1')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiMesocycleDraftNotFoundError)
        expect(metrics.draftsSettled).toEqual([])
    })
})
