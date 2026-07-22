import { describe, expect, it } from 'vitest'

import { AiPlanDraftMother, planDraftSet } from '../../../../../tests/mothers/ai'
import { AiPlanDraftNotOpenError, ConflictingPlanIntensityError } from '../errors/ai-plan.errors'
import { AiPlanDraftAggregate } from './ai-plan-draft.entity'

const LATER = new Date('2026-02-01T00:00:00.000Z')

const revision = { rationaleId: 'message-2', rationale: 'Backed off the volume.' }

describe('AiPlanDraftAggregate', () => {
    it('starts open, carrying the model’s rationale as its first message', () => {
        const draft = AiPlanDraftMother.open()

        expect(draft.status.isOpen).toBe(true)
        expect(draft.messages).toHaveLength(1)
        expect(draft.messages[0]?.role).toBe('assistant')
    })

    it('refuses a proposal where a set carries both an rpe and an rir', () => {
        expect(() => AiPlanDraftMother.open({ sets: [planDraftSet({ rpe: 8, rir: 2 })] })).toThrow(
            ConflictingPlanIntensityError,
        )
    })

    it('replaces the whole proposal on a revision, and records why', () => {
        const draft = AiPlanDraftMother.open()

        draft.revise([planDraftSet({ plannedWeightKg: 95 })], revision, LATER)

        expect(draft.sets).toEqual([planDraftSet({ plannedWeightKg: 95 })])
        expect(draft.messages.at(-1)?.content).toBe('Backed off the volume.')
    })

    it('refuses a revision that makes the intensity ambiguous', () => {
        const draft = AiPlanDraftMother.open()

        expect(() => draft.revise([planDraftSet({ rpe: 8, rir: 2 })], revision, LATER)).toThrow(
            ConflictingPlanIntensityError,
        )
    })

    it('records what the athlete asked for', () => {
        const draft = AiPlanDraftMother.open()

        draft.addMessage({ id: 'message-2', role: 'user', content: 'less volume' }, LATER)

        expect(draft.messages.at(-1)).toMatchObject({ role: 'user', content: 'less volume' })
    })

    it('cannot be accepted twice — that is what stops a double-click writing twice', () => {
        const draft = AiPlanDraftMother.open()

        draft.accept(LATER)

        expect(draft.status.value).toBe('accepted')
        expect(() => draft.accept(LATER)).toThrow(AiPlanDraftNotOpenError)
    })

    it('cannot be refined once resolved', () => {
        const draft = AiPlanDraftMother.open()
        draft.discard(LATER)

        expect(() => draft.revise([planDraftSet()], revision, LATER)).toThrow(AiPlanDraftNotOpenError)
        expect(() => draft.addMessage({ id: 'm', role: 'user', content: 'x' }, LATER)).toThrow(AiPlanDraftNotOpenError)
    })

    it('cannot be accepted after being discarded', () => {
        const draft = AiPlanDraftMother.open()
        draft.discard(LATER)

        expect(() => draft.accept(LATER)).toThrow(AiPlanDraftNotOpenError)
    })

    describe('forking a resolved conversation', () => {
        const forkOf = (source: ReturnType<typeof AiPlanDraftMother.open>) =>
            AiPlanDraftAggregate.fork({
                id: 'fork-1',
                source,
                provider: source.provider,
                model: 'gpt-5',
                rationaleId: 'message-fork',
                now: LATER,
            })

        it('opens a new draft on the same session, carrying the proposal', () => {
            const source = AiPlanDraftMother.open()
            source.accept(LATER)

            const fork = forkOf(source)

            expect(fork.status.value).toBe('open')
            expect(fork.sessionId).toBe(source.sessionId)
            expect(fork.entryId).toBe(source.entryId)
            expect(fork.sets).toEqual(source.sets)
            expect(fork.parentDraftId).toBe(source.id)
        })

        it('copies the sets rather than sharing them', () => {
            const source = AiPlanDraftMother.open()
            source.accept(LATER)
            const fork = forkOf(source)

            fork.revise([planDraftSet({ plannedReps: 12 })], revision, LATER)

            // Revising the fork must not rewrite the record of what was accepted.
            expect(source.sets[0]?.plannedReps).toBe(5)
        })

        it('starts a fresh thread opened by the reasoning behind the carried proposal', () => {
            const source = AiPlanDraftMother.open({ request: 'more volume on bench' })
            source.accept(LATER)

            const fork = forkOf(source)

            expect(fork.messages).toHaveLength(1)
            expect(fork.messages[0]?.role).toBe('assistant')
            expect(fork.messages[0]?.content).toBe(source.messages.at(-1)?.content)
        })

        it('is refinable, unlike the resolved draft it continues', () => {
            const source = AiPlanDraftMother.open()
            source.accept(LATER)
            const fork = forkOf(source)

            expect(() => fork.addMessage({ id: 'm', role: 'user', content: 'lighter' }, LATER)).not.toThrow()
        })
    })
})
