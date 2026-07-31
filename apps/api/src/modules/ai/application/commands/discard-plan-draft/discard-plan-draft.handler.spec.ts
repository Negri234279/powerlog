import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryAiPlanDraftRepository,
    RecordingAiGenerationMetrics,
} from '../../../../../../tests/doubles/ai'
import { AI_DRAFT_DEFAULTS, AiPlanDraftMother } from '../../../../../../tests/mothers/ai'
import { AiPlanDraftNotFoundError } from '../../../domain/errors/ai-plan.errors'
import { DiscardPlanDraftCommand } from './discard-plan-draft.command'
import { DiscardPlanDraftHandler } from './discard-plan-draft.handler'

const USER_ID = AI_DRAFT_DEFAULTS.userId

describe('DiscardPlanDraftHandler', () => {
    let drafts: InMemoryAiPlanDraftRepository
    let metrics: RecordingAiGenerationMetrics

    const buildHandler = () => new DiscardPlanDraftHandler(drafts, new FakeClock(), metrics)

    beforeEach(() => {
        drafts = new InMemoryAiPlanDraftRepository()
        metrics = new RecordingAiGenerationMetrics()
    })

    it('discards the draft and records the outcome', async () => {
        drafts.seed(AiPlanDraftMother.open())
        const command = new DiscardPlanDraftCommand(USER_ID, 'draft-1')

        await buildHandler().execute(command)

        expect((await drafts.findById('draft-1'))?.status.isOpen).toBe(false)
        expect(metrics.draftsSettled).toEqual([{ kind: 'session_plan', outcome: 'discarded', model: 'gpt-5' }])
        expect(metrics.refinementsBeforeAccept).toEqual([])
    })

    it('refuses another user’s draft and records nothing', async () => {
        drafts.seed(AiPlanDraftMother.open({ userId: '22222222-2222-4222-8222-222222222222' }))
        const command = new DiscardPlanDraftCommand(USER_ID, 'draft-1')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiPlanDraftNotFoundError)
        expect(metrics.draftsSettled).toEqual([])
    })
})
