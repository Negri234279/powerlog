import { describe, expect, it } from 'vitest'

import { CATALOG_IDS, MesocycleDesignContextMother } from '../../../../../tests/mothers/ai'
import type { CatalogExercise } from '../../../../shared/contracts/mesocycle-design-context'
import { DEFAULT_PROGRESSION } from '../../domain/entities/ai-mesocycle-draft.entity'
import { MAX_RATIONALE_LENGTH } from './mesocycle-prompt.service'
import { parseMesocycleResponse } from './mesocycle-response.parser'
import { ModelAnswerRejection } from './model-answer'

const CATALOG: ReadonlyMap<string, CatalogExercise> = new Map(
    MesocycleDesignContextMother.create().catalog.map((exercise) => [exercise.slug, exercise]),
)

const TRAINING_DAYS = [0, 2]

const day = (dayOffset: number, slug = 'low-bar-squat') => ({
    dayOffset,
    label: 'Day',
    exercises: [{ slug, notes: null, sets: [{ weightKg: 140, reps: 5, rpe: 8, rir: null, note: null }] }],
})

const answer = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
        name: 'Strength block',
        rationale: 'Squat first, bench second.',
        days: TRAINING_DAYS.map((offset) => day(offset)),
        ...overrides,
    })

const parse = (text: string, trainingDays: readonly number[] = TRAINING_DAYS) =>
    parseMesocycleResponse(text, CATALOG, trainingDays)

describe('parseMesocycleResponse', () => {
    it('resolves each slug to the catalog’s own id and canonical name', () => {
        const parsed = parse(answer())

        const exercise = parsed.days[0]?.exercises[0]
        expect(exercise?.exerciseId).toBe(CATALOG_IDS.squat)
        expect(exercise?.name).toBe('Low-Bar Back Squat')
    })

    it('numbers the sets by their position, so the model cannot fumble the order', () => {
        const sets = [
            { weightKg: 140, reps: 5, rpe: 8, rir: null, note: 'top' },
            { weightKg: 120, reps: 8, rpe: null, rir: 2, note: null },
        ]
        const days = [{ ...day(0), exercises: [{ slug: 'bench-press', notes: null, sets }] }, day(2)]

        const parsed = parse(answer({ days }))

        expect(parsed.days[0]?.exercises[0]?.sets.map((set) => set.order)).toEqual([1, 2])
    })

    it('takes the JSON even when the model wraps it in a code fence', () => {
        const parsed = parse(`Here you go:\n\`\`\`json\n${answer()}\n\`\`\``)

        expect(parsed.name).toBe('Strength block')
    })

    it('defaults the progression to the neutral one when the model omits it', () => {
        expect(parse(answer()).progression).toEqual(DEFAULT_PROGRESSION)
    })

    it('parses a progression the model provides', () => {
        const progression = {
            model: 'rpe_ramp',
            weeklyIntensityStepPct: 2.5,
            weeklySetIncrement: 1,
            deloadWeeks: [2],
            deloadFactor: 0.6,
        }

        const parsed = parse(answer({ progression }))

        expect(parsed.progression).toEqual(progression)
    })

    describe('rejects an answer that', () => {
        it('names an exercise that is not in the catalog', () => {
            const days = [day(0, 'zercher-goblet-thruster'), day(2)]

            expect(() => parse(answer({ days }))).toThrow(ModelAnswerRejection)
        })

        it('trains a day the athlete never asked for', () => {
            const days = [day(0), day(5)]

            expect(() => parse(answer({ days }))).toThrow(ModelAnswerRejection)
        })

        it('leaves one of the requested days unprogrammed', () => {
            const days = [day(0)]

            expect(() => parse(answer({ days }))).toThrow(ModelAnswerRejection)
        })

        it('programs the same day twice', () => {
            const days = [day(0), day(0)]

            expect(() => parse(answer({ days }))).toThrow(ModelAnswerRejection)
        })

        it('gives a set both an rpe and an rir', () => {
            const sets = [{ weightKg: 140, reps: 5, rpe: 8, rir: 2, note: null }]
            const days = [{ ...day(0), exercises: [{ slug: 'bench-press', notes: null, sets }] }, day(2)]

            expect(() => parse(answer({ days }))).toThrow(ModelAnswerRejection)
        })

        it('contains no JSON at all', () => {
            expect(() => parse('I cannot help with that.')).toThrow(ModelAnswerRejection)
        })

        it('is malformed JSON', () => {
            expect(() => parse('{ "name": "x", "days": [ }')).toThrow(ModelAnswerRejection)
        })

        it('gives an exercise no sets', () => {
            const days = [{ ...day(0), exercises: [{ slug: 'bench-press', notes: null, sets: [] }] }, day(2)]

            expect(() => parse(answer({ days }))).toThrow(ModelAnswerRejection)
        })

        // The rationale is the one free-text field that reaches the athlete. A
        // model argued into writing an essay has nowhere to put it.
        it('runs a rationale past its length cap', () => {
            const rationale = 'a'.repeat(MAX_RATIONALE_LENGTH + 1)

            expect(() => parse(answer({ rationale }))).toThrow(ModelAnswerRejection)
        })

        it('answers with prose in place of the week', () => {
            const text = JSON.stringify({ answer: 'Sure! Here is a poem about squats.' })

            expect(() => parse(text)).toThrow(ModelAnswerRejection)
        })
    })
})
