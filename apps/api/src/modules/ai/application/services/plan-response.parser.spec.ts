import { describe, expect, it } from 'vitest'

import { parsePlanResponse, PlanResponseRejection } from './plan-response.parser'

const EXPECTED = ['set-1', 'set-2']

const answer = (sets: unknown[], rationale = 'Progressed the top set.') => JSON.stringify({ rationale, sets })

const set = (overrides: Record<string, unknown> = {}) => ({
    setId: 'set-1',
    weightKg: 102.5,
    reps: 5,
    rpe: 8,
    rir: null,
    note: 'top set',
    ...overrides,
})

describe('parsePlanResponse', () => {
    it('parses a well-formed plan', () => {
        const plan = parsePlanResponse(
            answer([set(), set({ setId: 'set-2', weightKg: 90, rpe: null, rir: 2 })]),
            EXPECTED,
        )

        expect(plan.rationale).toBe('Progressed the top set.')
        expect(plan.sets).toEqual([
            { setId: 'set-1', plannedWeightKg: 102.5, plannedReps: 5, rpe: 8, rir: null, notes: 'top set' },
            { setId: 'set-2', plannedWeightKg: 90, plannedReps: 5, rpe: null, rir: 2, notes: 'top set' },
        ])
    })

    it('digs the JSON out of a code fence, because models add them', () => {
        const wrapped = '```json\n' + answer([set(), set({ setId: 'set-2' })]) + '\n```'

        expect(parsePlanResponse(wrapped, EXPECTED).sets).toHaveLength(2)
    })

    it('digs the JSON out from behind a sentence of prose', () => {
        const chatty = `Sure! Here is the plan:\n${answer([set(), set({ setId: 'set-2' })])}`

        expect(parsePlanResponse(chatty, EXPECTED).sets).toHaveLength(2)
    })

    it('treats omitted optional fields as null', () => {
        const sparse = [
            { setId: 'set-1', weightKg: 100 },
            { setId: 'set-2', weightKg: 90 },
        ]

        expect(parsePlanResponse(answer(sparse), EXPECTED).sets[0]).toEqual({
            setId: 'set-1',
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
        expect(() => parsePlanResponse('{ "rationale": "x", "sets": [ }', EXPECTED)).toThrow(PlanResponseRejection)
    })

    it('rejects a hallucinated set id — the whole point of the check', () => {
        const rogue = answer([set(), set({ setId: 'set-2' }), set({ setId: 'set-99' })])

        expect(() => parsePlanResponse(rogue, EXPECTED)).toThrow(/not one of the given set ids/)
    })

    it('rejects a set prescribed twice', () => {
        expect(() => parsePlanResponse(answer([set(), set(), set({ setId: 'set-2' })]), EXPECTED)).toThrow(
            /prescribed twice/,
        )
    })

    it('rejects a plan that leaves a set unprescribed', () => {
        expect(() => parsePlanResponse(answer([set()]), EXPECTED)).toThrow(/unprescribed/)
    })

    it('rejects a set carrying both an rpe and an rir', () => {
        const both = answer([set({ rir: 2 }), set({ setId: 'set-2' })])

        expect(() => parsePlanResponse(both, EXPECTED)).toThrow(/both an rpe and an rir/)
    })

    it('rejects values outside the ranges a human could lift', () => {
        expect(() => parsePlanResponse(answer([set({ weightKg: 5000 }), set({ setId: 'set-2' })]), EXPECTED)).toThrow(
            PlanResponseRejection,
        )
        expect(() => parsePlanResponse(answer([set({ rpe: 42 }), set({ setId: 'set-2' })]), EXPECTED)).toThrow(
            PlanResponseRejection,
        )
    })

    it('rejects a missing rationale', () => {
        expect(() => parsePlanResponse(JSON.stringify({ sets: [set()] }), EXPECTED)).toThrow(PlanResponseRejection)
    })

    it('explains what was wrong, so the retry can tell the model', () => {
        expect(() => parsePlanResponse(answer([set({ setId: 'nope' })]), EXPECTED)).toThrow(
            expect.objectContaining({ message: expect.stringContaining('"nope"') }),
        )
    })
})
