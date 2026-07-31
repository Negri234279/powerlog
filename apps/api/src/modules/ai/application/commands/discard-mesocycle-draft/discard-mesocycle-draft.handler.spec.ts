import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryAiMesocycleDraftRepository,
    RecordingAiGenerationMetrics,
} from '../../../../../../tests/doubles/ai'
import { AI_MESOCYCLE_DRAFT_DEFAULTS, AiMesocycleDraftMother } from '../../../../../../tests/mothers/ai'
import { AiMesocycleDraftNotFoundError } from '../../../domain/errors/ai-mesocycle.errors'
import { DiscardMesocycleDraftCommand } from './discard-mesocycle-draft.command'
import { DiscardMesocycleDraftHandler } from './discard-mesocycle-draft.handler'

const USER_ID = AI_MESOCYCLE_DRAFT_DEFAULTS.userId

describe('DiscardMesocycleDraftHandler', () => {
    let drafts: InMemoryAiMesocycleDraftRepository
    let metrics: RecordingAiGenerationMetrics

    const buildHandler = () => new DiscardMesocycleDraftHandler(drafts, new FakeClock(), metrics)

    beforeEach(() => {
        drafts = new InMemoryAiMesocycleDraftRepository()
        metrics = new RecordingAiGenerationMetrics()
    })

    it('discards the draft and records the outcome', async () => {
        drafts.seed(AiMesocycleDraftMother.open())
        const command = new DiscardMesocycleDraftCommand(USER_ID, 'draft-1')

        await buildHandler().execute(command)

        // Kept, not deleted — just resolved.
        expect((await drafts.findById('draft-1'))?.status.isOpen).toBe(false)
        expect(metrics.draftsSettled).toEqual([{ kind: 'mesocycle', outcome: 'discarded', model: 'gpt-5' }])
        // Refinements are an acceptance-only signal.
        expect(metrics.refinementsBeforeAccept).toEqual([])
    })

    it('refuses another user’s draft and records nothing', async () => {
        drafts.seed(AiMesocycleDraftMother.open({ userId: '22222222-2222-4222-8222-222222222222' }))
        const command = new DiscardMesocycleDraftCommand(USER_ID, 'draft-1')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiMesocycleDraftNotFoundError)
        expect(metrics.draftsSettled).toEqual([])
    })
})
