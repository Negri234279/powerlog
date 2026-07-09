import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryAiPlanDraftRepository,
    RecordingSessionPlanApplier,
} from '../../../../../../tests/doubles/ai'
import { silentLogger } from '../../../../../../tests/doubles/shared'
import { AI_DRAFT_DEFAULTS, AiPlanDraftMother } from '../../../../../../tests/mothers/ai'
import { AiPlanDraftNotFoundError, AiPlanDraftNotOpenError } from '../../../domain/errors/ai-plan.errors'
import { AcceptPlanDraftCommand } from './accept-plan-draft.command'
import { AcceptPlanDraftHandler } from './accept-plan-draft.handler'

const USER_ID = AI_DRAFT_DEFAULTS.userId

describe('AcceptPlanDraftHandler', () => {
    let drafts: InMemoryAiPlanDraftRepository
    let applier: RecordingSessionPlanApplier

    const buildHandler = () => new AcceptPlanDraftHandler(drafts, applier, new FakeClock(), silentLogger())

    beforeEach(() => {
        drafts = new InMemoryAiPlanDraftRepository()
        applier = new RecordingSessionPlanApplier()
    })

    it('hands the plan to workouts and marks the draft accepted', async () => {
        drafts.seed(AiPlanDraftMother.open())
        const command = new AcceptPlanDraftCommand(USER_ID, 'draft-1')

        const view = await buildHandler().execute(command)

        expect(applier.applied).toEqual([
            { userId: USER_ID, sessionId: 'session-1', sets: [expect.objectContaining({ setId: 'set-1' })] },
        ])
        expect(view.status).toBe('accepted')
    })

    it('leaves the draft open when workouts rejects the plan', async () => {
        drafts.seed(AiPlanDraftMother.open())
        applier = new RecordingSessionPlanApplier(new Error('set was deleted'))
        const command = new AcceptPlanDraftCommand(USER_ID, 'draft-1')

        await expect(buildHandler().execute(command)).rejects.toThrow('set was deleted')

        // Still open: the athlete can regenerate rather than be stuck.
        expect((await drafts.findById('draft-1'))?.status.isOpen).toBe(true)
    })

    it('does not write the plan twice when accepted twice', async () => {
        drafts.seed(AiPlanDraftMother.open())
        const handler = buildHandler()
        const command = new AcceptPlanDraftCommand(USER_ID, 'draft-1')

        await handler.execute(command)

        await expect(handler.execute(command)).rejects.toThrow(AiPlanDraftNotOpenError)
        expect(applier.applied).toHaveLength(1)
    })

    it('refuses another user’s draft', async () => {
        drafts.seed(AiPlanDraftMother.open({ userId: '22222222-2222-4222-8222-222222222222' }))
        const command = new AcceptPlanDraftCommand(USER_ID, 'draft-1')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiPlanDraftNotFoundError)
        expect(applier.applied).toEqual([])
    })

    it('refuses a draft that does not exist', async () => {
        const command = new AcceptPlanDraftCommand(USER_ID, 'draft-nope')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiPlanDraftNotFoundError)
    })
})
