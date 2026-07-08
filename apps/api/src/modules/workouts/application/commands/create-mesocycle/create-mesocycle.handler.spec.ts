import { describe, expect, it } from 'vitest'

import { ExerciseMother } from '../../../../../../tests/mothers/workouts'
import {
    FakeClock,
    FakeIdGenerator,
    InMemoryExerciseRepository,
    InMemoryMesocycleRepository,
} from '../../../../../../tests/doubles/workouts'
import { ConflictingIntensityError, ExerciseNotFoundError } from '../../../domain/errors/workouts.errors'
import type { MesocycleContentRaw } from '../../mesocycle-content'
import { CreateMesocycleCommand } from './create-mesocycle.command'
import { CreateMesocycleHandler } from './create-mesocycle.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const OWNER = 'u-1'

const SQUAT = ExerciseMother.create({ id: 'ex-squat', slug: 'back-squat', name: 'Back Squat' })

function setup() {
    const mesocycles = new InMemoryMesocycleRepository()
    const exercises = new InMemoryExerciseRepository([SQUAT])
    const handler = new CreateMesocycleHandler(mesocycles, exercises, new FakeClock(NOW), new FakeIdGenerator())
    return { mesocycles, handler }
}

function content(overrides: Partial<MesocycleContentRaw> = {}): MesocycleContentRaw {
    return {
        name: 'Hypertrophy Block',
        goal: 'hypertrophy',
        startDate: '2026-01-05',
        microcycles: [
            {
                label: 'Week 1',
                days: [
                    {
                        dayOffset: 0,
                        label: 'Day 1',
                        exercises: [
                            {
                                exerciseId: SQUAT.id,
                                sets: [
                                    { plannedWeight: 100, plannedReps: 5, rpe: 8 },
                                    { plannedWeight: 90, plannedReps: 8 },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                label: 'Week 2',
                days: [
                    {
                        dayOffset: 0,
                        exercises: [{ exerciseId: SQUAT.id, sets: [{ plannedWeight: 105, plannedReps: 5 }] }],
                    },
                ],
            },
        ],
        ...overrides,
    }
}

describe('CreateMesocycleHandler', () => {
    it('creates a draft mesocycle owned by the caller with an ordered tree', async () => {
        const { mesocycles, handler } = setup()

        const view = await handler.execute(new CreateMesocycleCommand(OWNER, content()))

        expect(view).toMatchObject({ ownerId: OWNER, name: 'Hypertrophy Block', goal: 'hypertrophy', status: 'draft' })
        expect(view.generatedWeeks).toEqual([])
        expect(view.microcycles.map((m) => m.weekIndex)).toEqual([1, 2])
        const day1 = view.microcycles[0]!.days[0]!
        expect(day1.dayOffset).toBe(0)
        expect(day1.exercises[0]!.sets.map((s) => s.order)).toEqual([1, 2])
        expect(day1.exercises[0]!.sets[0]).toMatchObject({ plannedWeightKg: 100, plannedReps: 5, rpe: 8 })
        expect(view.createdAt).toEqual(NOW)
        expect(await mesocycles.findById(view.id)).not.toBeNull()
    })

    it('converts pound inputs to canonical kilograms', async () => {
        const { handler } = setup()

        const view = await handler.execute(
            new CreateMesocycleCommand(OWNER, {
                name: 'Heavy',
                microcycles: [
                    {
                        days: [
                            {
                                dayOffset: 0,
                                exercises: [
                                    {
                                        exerciseId: SQUAT.id,
                                        sets: [{ unit: 'lb', plannedWeight: 225, plannedReps: 3 }],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }),
        )

        expect(view.microcycles[0]!.days[0]!.exercises[0]!.sets[0]!.plannedWeightKg).toBeCloseTo(102.06, 2)
    })

    it('rejects a mesocycle referencing an unknown exercise', async () => {
        const { mesocycles, handler } = setup()

        await expect(
            handler.execute(
                new CreateMesocycleCommand(OWNER, {
                    name: 'X',
                    microcycles: [{ days: [{ dayOffset: 0, exercises: [{ exerciseId: 'nope', sets: [] }] }] }],
                }),
            ),
        ).rejects.toBeInstanceOf(ExerciseNotFoundError)
        expect(mesocycles.size).toBe(0)
    })

    it('rejects a set programmed with both RPE and RIR', async () => {
        const { handler } = setup()

        await expect(
            handler.execute(
                new CreateMesocycleCommand(OWNER, {
                    name: 'X',
                    microcycles: [
                        {
                            days: [{ dayOffset: 0, exercises: [{ exerciseId: SQUAT.id, sets: [{ rpe: 8, rir: 2 }] }] }],
                        },
                    ],
                }),
            ),
        ).rejects.toBeInstanceOf(ConflictingIntensityError)
    })
})
