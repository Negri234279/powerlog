import { describe, expect, it } from 'vitest'

import { parsePlanResponse, PlanResponseRejection } from './plan-response.parser'

const EXPECTED = ['entry-1', 'entry-2']

const set = (overrides: Record<string, unknown> = {}) => ({
    weightKg: 102.5,
    reps: 5,
    rpe: 8,
    rir: null,
    note: 'top set',
    ...overrides,
})

const answer = (exercises: unknown[], rationale = 'Progressed the top set.') => JSON.stringify({ rationale, exercises })

const bothExercises = (firstSets: unknown[] = [set()], secondSets: unknown[] = [set({ weightKg: 60 })]) => [
    { entryId: 'entry-1', sets: firstSets },
    { entryId: 'entry-2', sets: secondSets },
]

describe('parsePlanResponse', () => {
    it('parses a plan, assigning set positions by array order', () => {
        const plan = parsePlanResponse(
            answer(bothExercises([set(), set({ weightKg: 90, rpe: null, rir: 2, note: 'back-off' })])),
            EXPECTED,
        )

        expect(plan.rationale).toBe('Progressed the top set.')
        expect(plan.sets).toEqual([
            {
                entryId: 'entry-1',
                order: 1,
                plannedWeightKg: 102.5,
                plannedReps: 5,
                rpe: 8,
                rir: null,
                notes: 'top set',
            },
            { entryId: 'entry-1', order: 2, plannedWeightKg: 90, plannedReps: 5, rpe: null, rir: 2, notes: 'back-off' },
            { entryId: 'entry-2', order: 1, plannedWeightKg: 60, plannedReps: 5, rpe: 8, rir: null, notes: 'top set' },
        ])
    })

    it('lets the model own the set count — the point of the whole shape', () => {
        const fourSets = [set(), set(), set(), set()]

        const plan = parsePlanResponse(answer(bothExercises(fourSets)), EXPECTED)

        expect(plan.sets.filter((planned) => planned.entryId === 'entry-1')).toHaveLength(4)
    })

    it('digs the JSON out of a code fence, because models add them', () => {
        const wrapped = '```json\n' + answer(bothExercises()) + '\n```'

        expect(parsePlanResponse(wrapped, EXPECTED).sets).toHaveLength(2)
    })

    it('digs the JSON out from behind a sentence of prose', () => {
        const chatty = `Sure! Here is the plan:\n${answer(bothExercises())}`

        expect(parsePlanResponse(chatty, EXPECTED).sets).toHaveLength(2)
    })

    it('treats omitted optional fields as null', () => {
        const sparse = bothExercises([{ weightKg: 100 }])

        expect(parsePlanResponse(answer(sparse), EXPECTED).sets[0]).toEqual({
            entryId: 'entry-1',
            order: 1,
            plannedWeightKg: 100,
            plannedReps: null,
            rpe: null,
            rir: null,
            notes: null,
        })
    })

    it('rejects an answer with no JSON at all', () => {
        expect(() => parsePlanResponse('I cannot help with that.', EXPECTED)).toThrow(PlanResponseRejection)
    })

    it('rejects malformed JSON', () => {
        expect(() => parsePlanResponse('{ "rationale": "x", "exercises": [ }', EXPECTED)).toThrow(PlanResponseRejection)
    })

    it('rejects a hallucinated entry id — the safety check that matters', () => {
        const rogue = [...bothExercises(), { entryId: 'entry-99', sets: [set()] }]

        expect(() => parsePlanResponse(answer(rogue), EXPECTED)).toThrow(/not one of the given entryId values/)
    })

    it('rejects an exercise programmed twice', () => {
        const doubled = [...bothExercises(), { entryId: 'entry-1', sets: [set()] }]

        expect(() => parsePlanResponse(answer(doubled), EXPECTED)).toThrow(/programmed twice/)
    })

    it('rejects a plan that leaves an exercise unprogrammed', () => {
        expect(() => parsePlanResponse(answer([{ entryId: 'entry-1', sets: [set()] }]), EXPECTED)).toThrow(
            /unprogrammed/,
        )
    })

    it('rejects an exercise with no sets, or an absurd number of them', () => {
        expect(() => parsePlanResponse(answer(bothExercises([])), EXPECTED)).toThrow(PlanResponseRejection)

        const looping = Array.from({ length: 9 }, () => set())
        expect(() => parsePlanResponse(answer(bothExercises(looping)), EXPECTED)).toThrow(PlanResponseRejection)
    })

    it('rejects a set carrying both an rpe and an rir', () => {
        expect(() => parsePlanResponse(answer(bothExercises([set({ rir: 2 })])), EXPECTED)).toThrow(
            /both an rpe and an rir/,
        )
    })

    it('rejects values outside the ranges a human could lift', () => {
        expect(() => parsePlanResponse(answer(bothExercises([set({ weightKg: 5000 })])), EXPECTED)).toThrow(
            PlanResponseRejection,
        )
        expect(() => parsePlanResponse(answer(bothExercises([set({ rpe: 42 })])), EXPECTED)).toThrow(
            PlanResponseRejection,
        )
    })

    it('rejects a missing rationale', () => {
        expect(() => parsePlanResponse(JSON.stringify({ exercises: bothExercises() }), EXPECTED)).toThrow(
            PlanResponseRejection,
        )
    })

    it('explains what was wrong, so the retry can tell the model', () => {
        const rogue = [...bothExercises(), { entryId: 'nope', sets: [set()] }]

        expect(() => parsePlanResponse(answer(rogue), EXPECTED)).toThrow(
            expect.objectContaining({ message: expect.stringContaining('"nope"') }),
        )
    })
})
