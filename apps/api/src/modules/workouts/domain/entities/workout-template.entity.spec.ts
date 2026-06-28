import { describe, expect, it } from 'vitest'

import { ConflictingIntensityError } from '../errors/workouts.errors'
import { RepsVO } from '../value-objects/reps.vo'
import { RirVO } from '../value-objects/rir.vo'
import { RpeVO } from '../value-objects/rpe.vo'
import { TemplateNameVO } from '../value-objects/template-name.vo'
import { WeightVO } from '../value-objects/weight.vo'
import { type TemplateContentInput, WorkoutTemplateAggregate } from './workout-template.entity'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const LATER = new Date('2026-03-02T10:00:00.000Z')

function sequentialIds(): () => string {
    let n = 0
    return () => `id-${++n}`
}

function content(overrides: Partial<TemplateContentInput> = {}): TemplateContentInput {
    return {
        name: TemplateNameVO.create('Upper A'),
        notes: 'Push focus',
        exercises: [
            {
                exerciseId: 'ex-1',
                sets: [
                    { plannedWeight: WeightVO.create(100), plannedReps: RepsVO.create(5) },
                    { plannedWeight: WeightVO.create(90), plannedReps: RepsVO.create(8) },
                ],
            },
            { exerciseId: 'ex-2', sets: [{ plannedReps: RepsVO.create(12) }] },
        ],
        ...overrides,
    }
}

function create(input: Partial<TemplateContentInput> = {}): WorkoutTemplateAggregate {
    return WorkoutTemplateAggregate.create({
        id: 't-1',
        ownerId: 'u-1',
        content: content(input),
        idFactory: sequentialIds(),
        now: NOW,
    })
}

describe('WorkoutTemplateAggregate', () => {
    it('assigns 1-based order to exercises and sets by position', () => {
        const template = create()

        expect(template.exercises.map((e) => e.order)).toEqual([1, 2])
        expect(template.exercises[0]?.sets.map((s) => s.order)).toEqual([1, 2])
        expect(template.exercises[0]?.exerciseId).toBe('ex-1')
        expect(template.exercises[1]?.sets).toHaveLength(1)
    })

    it('stores the name and notes and stamps timestamps', () => {
        const template = create()

        expect(template.name.value).toBe('Upper A')
        expect(template.notes).toBe('Push focus')
        expect(template.createdAt).toEqual(NOW)
        expect(template.updatedAt).toEqual(NOW)
    })

    it('rejects a set programmed with both RPE and RIR', () => {
        expect(() =>
            create({
                exercises: [{ exerciseId: 'ex-1', sets: [{ rpe: RpeVO.create(8), rir: RirVO.create(2) }] }],
            }),
        ).toThrow(ConflictingIntensityError)
    })

    it('replaceContent rebuilds the whole tree, re-orders, and bumps updatedAt', () => {
        const template = create()

        template.replaceContent(
            content({
                name: TemplateNameVO.create('Upper B'),
                notes: null,
                exercises: [{ exerciseId: 'ex-9', sets: [{ plannedReps: RepsVO.create(3) }] }],
            }),
            sequentialIds(),
            LATER,
        )

        expect(template.name.value).toBe('Upper B')
        expect(template.notes).toBeNull()
        expect(template.exercises).toHaveLength(1)
        expect(template.exercises[0]?.exerciseId).toBe('ex-9')
        expect(template.exercises[0]?.order).toBe(1)
        expect(template.createdAt).toEqual(NOW)
        expect(template.updatedAt).toEqual(LATER)
    })
})
