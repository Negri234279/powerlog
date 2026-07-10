import { describe, expect, it } from 'vitest'

import {
    AiMesocycleDraftMother,
    mesocycleDraftDay,
    mesocycleDraftExercise,
    mesocycleDraftProposal,
    mesocycleDraftSet,
} from '../../../../../tests/mothers/ai'
import {
    AiDraftThreadExhaustedError,
    AiMesocycleDraftNotOpenError,
    InvalidMesocycleDraftProposalError,
} from '../errors/ai-mesocycle.errors'
import { ConflictingPlanIntensityError } from '../errors/ai-plan.errors'
import { AiMesocycleDraftAggregate, MESOCYCLE_DRAFT_LIMITS } from './ai-mesocycle-draft.entity'

const LATER = new Date('2026-02-01T00:00:00.000Z')

const revision = { rationaleId: 'message-3', rationale: 'Dropped the third day.' }

describe('AiMesocycleDraftAggregate', () => {
    it('starts open, with the athlete’s request and the model’s rationale as its thread', () => {
        const draft = AiMesocycleDraftMother.open()

        expect(draft.status.isOpen).toBe(true)
        expect(draft.messages.map((message) => message.role)).toEqual(['user', 'assistant'])
    })

    it('replaces the whole proposed week on a revision, and records why', () => {
        const draft = AiMesocycleDraftMother.open()
        const revised = mesocycleDraftProposal({ name: 'Hypertrophy block' })

        draft.revise(revised, revision, LATER)

        expect(draft.proposal.name).toBe('Hypertrophy block')
        expect(draft.messages.at(-1)?.content).toBe('Dropped the third day.')
    })

    it('records what the athlete asked for', () => {
        const draft = AiMesocycleDraftMother.open()

        draft.addMessage({ id: 'message-3', role: 'user', content: 'add a pull day' }, LATER)

        expect(draft.messages.at(-1)).toMatchObject({ role: 'user', content: 'add a pull day' })
    })

    it('cannot be accepted twice — a double-click must not seed the builder off a resolved draft', () => {
        const draft = AiMesocycleDraftMother.open()

        draft.accept(LATER)

        expect(draft.status.value).toBe('accepted')
        expect(() => draft.accept(LATER)).toThrow(AiMesocycleDraftNotOpenError)
    })

    it('cannot be refined once resolved', () => {
        const draft = AiMesocycleDraftMother.open()

        draft.discard(LATER)

        expect(() => draft.revise(mesocycleDraftProposal(), revision, LATER)).toThrow(AiMesocycleDraftNotOpenError)
        expect(() => draft.addMessage({ id: 'm', role: 'user', content: 'more' }, LATER)).toThrow(
            AiMesocycleDraftNotOpenError,
        )
    })

    it('stops the refinement thread from becoming an open-ended chat', () => {
        const draft = AiMesocycleDraftMother.open()

        // Two messages exist already; fill the thread to its ceiling.
        for (let index = draft.messages.length; index < MESOCYCLE_DRAFT_LIMITS.messages; index++) {
            draft.addMessage({ id: `message-${index}`, role: 'user', content: 'again' }, LATER)
        }

        expect(() => draft.addMessage({ id: 'one-too-many', role: 'user', content: 'again' }, LATER)).toThrow(
            AiDraftThreadExhaustedError,
        )
    })

    describe('a proposal that is not a training week', () => {
        it('is refused when a set claims both an rpe and an rir', () => {
            const sets = [mesocycleDraftSet({ rpe: 8, rir: 2 })]
            const proposal = mesocycleDraftProposal({
                days: [mesocycleDraftDay({ exercises: [mesocycleDraftExercise({ sets })] })],
            })

            expect(() => AiMesocycleDraftMother.open({ proposal })).toThrow(ConflictingPlanIntensityError)
        })

        it('is refused when it has no days at all', () => {
            expect(() => AiMesocycleDraftMother.open({ proposal: mesocycleDraftProposal({ days: [] }) })).toThrow(
                InvalidMesocycleDraftProposalError,
            )
        })

        it('is refused when the same day is programmed twice', () => {
            const proposal = mesocycleDraftProposal({
                days: [mesocycleDraftDay({ dayOffset: 2 }), mesocycleDraftDay({ dayOffset: 2 })],
            })

            expect(() => AiMesocycleDraftMother.open({ trainingDays: [2], proposal })).toThrow(
                InvalidMesocycleDraftProposalError,
            )
        })

        it('is refused when it trains a day the athlete never asked for', () => {
            const proposal = mesocycleDraftProposal({ days: [mesocycleDraftDay({ dayOffset: 3 })] })

            expect(() => AiMesocycleDraftMother.open({ trainingDays: [0], proposal })).toThrow(
                InvalidMesocycleDraftProposalError,
            )
        })

        it('is refused when it leaves one of the requested days empty', () => {
            const proposal = mesocycleDraftProposal({ days: [mesocycleDraftDay({ dayOffset: 0 })] })

            expect(() => AiMesocycleDraftMother.open({ trainingDays: [0, 2], proposal })).toThrow(
                InvalidMesocycleDraftProposalError,
            )
        })

        it('is refused when an exercise carries no sets', () => {
            const proposal = mesocycleDraftProposal({
                days: [mesocycleDraftDay({ exercises: [mesocycleDraftExercise({ sets: [] })] })],
            })

            expect(() => AiMesocycleDraftMother.open({ proposal })).toThrow(InvalidMesocycleDraftProposalError)
        })

        it('is refused when a day carries no exercises', () => {
            const proposal = mesocycleDraftProposal({ days: [mesocycleDraftDay({ exercises: [] })] })

            expect(() => AiMesocycleDraftMother.open({ proposal })).toThrow(InvalidMesocycleDraftProposalError)
        })

        it('is refused when it has no name', () => {
            expect(() => AiMesocycleDraftMother.open({ proposal: mesocycleDraftProposal({ name: '  ' }) })).toThrow(
                InvalidMesocycleDraftProposalError,
            )
        })

        it('is refused on a revision too, not just at creation', () => {
            const draft = AiMesocycleDraftMother.open()

            expect(() => draft.revise(mesocycleDraftProposal({ days: [] }), revision, LATER)).toThrow(
                InvalidMesocycleDraftProposalError,
            )
        })
    })

    it('refuses a block that runs for more weeks than a block can', () => {
        expect(() => AiMesocycleDraftMother.open({ weeks: 53 })).toThrow(InvalidMesocycleDraftProposalError)
        expect(() => AiMesocycleDraftMother.open({ weeks: 0 })).toThrow(InvalidMesocycleDraftProposalError)
    })

    it('re-asserts its invariants on rehydrate — jsonb is not shape-checked by Postgres', () => {
        const stored = AiMesocycleDraftMother.open()
        const corrupted = {
            id: stored.id,
            userId: stored.userId,
            provider: stored.provider,
            model: stored.model,
            status: stored.status,
            weeks: stored.weeks,
            trainingDays: [...stored.trainingDays],
            goal: stored.goal,
            // What a hand-edited or half-migrated `content` column could hold.
            proposal: mesocycleDraftProposal({ days: [] }),
            messages: [...stored.messages],
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
        }

        expect(() => AiMesocycleDraftAggregate.rehydrate(corrupted)).toThrow(InvalidMesocycleDraftProposalError)
    })
})
