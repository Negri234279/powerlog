import { describe, expect, it } from 'vitest'

import {
    AiGenerationMother,
    mesocycleRequest,
    refinementRequest,
    sessionPlanRequest,
} from '../../../../../tests/mothers/ai'
import {
    AiGenerationAlreadySettledError,
    AiGenerationNotQueuedError,
    InvalidAiGenerationRequestError,
} from '../errors/ai-generation.errors'

const LATER = new Date('2026-01-01T00:00:30.000Z')
const DRAFT_ID = '22222222-2222-4222-8222-222222222222'

describe('AiGenerationAggregate', () => {
    it('starts queued, with nothing to show for it yet', () => {
        const generation = AiGenerationMother.sessionPlan()

        expect(generation.status.isQueued).toBe(true)
        expect(generation.draftId).toBeNull()
        expect(generation.failureCode).toBeNull()
    })

    it('points at the draft it produced once it succeeds', () => {
        const generation = AiGenerationMother.running()

        generation.succeed(DRAFT_ID, LATER)

        expect(generation.status.isSettled).toBe(true)
        expect(generation.draftId).toBe(DRAFT_ID)
    })

    it('records why it failed, and produces no draft', () => {
        const generation = AiGenerationMother.running()

        generation.fail('INVALID_AI_MESOCYCLE_RESPONSE', LATER)

        expect(generation.status.value).toBe('failed')
        expect(generation.failureCode).toBe('INVALID_AI_MESOCYCLE_RESPONSE')
        expect(generation.draftId).toBeNull()
    })

    it('can fail without ever having been picked up', () => {
        const generation = AiGenerationMother.sessionPlan()

        generation.fail('AI_PROVIDER_NOT_CONFIGURED', LATER)

        expect(generation.status.value).toBe('failed')
    })

    it('refuses a failure reason that is not a stable code', () => {
        const generation = AiGenerationMother.running()

        expect(() => generation.fail('the model said something odd', LATER)).toThrow(InvalidAiGenerationRequestError)
    })

    it('refuses to be picked up twice, so a duplicated job is not paid for twice', () => {
        const generation = AiGenerationMother.running()

        expect(() => generation.start(LATER)).toThrow(AiGenerationNotQueuedError)
    })

    it('refuses to be settled twice, whatever the second outcome would be', () => {
        const generation = AiGenerationMother.running()
        generation.succeed(DRAFT_ID, LATER)

        expect(() => generation.fail('UNKNOWN', LATER)).toThrow(AiGenerationAlreadySettledError)
        expect(() => generation.succeed(DRAFT_ID, LATER)).toThrow(AiGenerationAlreadySettledError)
    })

    describe('the request it carries', () => {
        it('refuses a session-plan job with no session to program', () => {
            expect(() => AiGenerationMother.sessionPlan(sessionPlanRequest({ sessionId: 'not-an-id' }))).toThrow(
                InvalidAiGenerationRequestError,
            )
        })

        it('refuses a block with no training days', () => {
            expect(() => AiGenerationMother.mesocycle(mesocycleRequest({ trainingDays: [] }))).toThrow(
                InvalidAiGenerationRequestError,
            )
        })

        it('refuses a refinement that says nothing', () => {
            expect(() => AiGenerationMother.mesocycleRefinement(refinementRequest({ message: '   ' }))).toThrow(
                InvalidAiGenerationRequestError,
            )
        })
    })

    describe('the scope it occupies', () => {
        it('scopes a session plan to its session', () => {
            const sessionId = '33333333-3333-4333-8333-333333333333'
            const generation = AiGenerationMother.sessionPlan(sessionPlanRequest({ sessionId }))

            expect(generation.scopeKey).toBe(`session:${sessionId}`)
        })

        it('scopes a refinement to the draft it revises, whichever kind it is', () => {
            const request = refinementRequest({ draftId: DRAFT_ID })

            expect(AiGenerationMother.sessionPlanRefinement(request).scopeKey).toBe(`draft:${DRAFT_ID}`)
            expect(AiGenerationMother.mesocycleRefinement(request).scopeKey).toBe(`draft:${DRAFT_ID}`)
        })

        it('scopes a coach’s block to the athlete it is for, so their own stays free', () => {
            const athleteId = '44444444-4444-4444-8444-444444444444'
            const userId = '55555555-5555-4555-8555-555555555555'
            const forAthlete = AiGenerationMother.mesocycle(mesocycleRequest({ athleteId }), { userId })
            const forThemselves = AiGenerationMother.mesocycle(mesocycleRequest(), { userId })

            expect(forAthlete.scopeKey).toBe(`mesocycle:${athleteId}`)
            expect(forThemselves.scopeKey).toBe(`mesocycle:${userId}`)
        })
    })
})
