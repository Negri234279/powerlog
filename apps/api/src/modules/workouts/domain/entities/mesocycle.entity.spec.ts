import { describe, expect, it } from 'vitest'

import { MesocycleMother } from '../../../../../tests/mothers/workouts'
import { ConflictingIntensityError } from '../errors/workouts.errors'
import { MesocycleNameVO } from '../value-objects/mesocycle-name.vo'
import { RepsRangeVO } from '../value-objects/reps-range.vo'
import { RirRangeVO } from '../value-objects/rir-range.vo'
import { RpeRangeVO } from '../value-objects/rpe-range.vo'
import { type MesocycleContentInput, MesocycleAggregate } from './mesocycle.entity'

const NOW = new Date('2026-01-01T00:00:00.000Z')

// Deterministic ids â€” this is a pure domain spec, so ids are opaque and unasserted.
let seq = 0
const uid = (): string => `id-${++seq}`

describe('MesocycleAggregate', () => {
    it('builds a draft with 1-based week/day/exercise/set ordering', () => {
        const mesocycle = MesocycleMother.withTree('ex-1', { now: NOW })

        expect(mesocycle.status).toBe('draft')
        expect(mesocycle.createdAt).toEqual(NOW)
        expect(mesocycle.microcycles.map((m) => m.weekIndex)).toEqual([1, 2])

        const week1 = mesocycle.microcycles[0]!
        expect(week1.days.map((d) => d.order)).toEqual([1])
        const day1 = week1.days[0]!
        expect(day1.dayOffset).toBe(0)
        expect(day1.exercises[0]!.order).toBe(1)
        expect(day1.exercises[0]!.sets.map((s) => s.order)).toEqual([1, 2])
        expect(day1.exercises[0]!.sets[0]!.plannedWeight?.min.value).toBe(100)
    })

    it('finds the microcycle for a given week, or null', () => {
        const mesocycle = MesocycleMother.withTree('ex-1')

        expect(mesocycle.microcycleForWeek(2)?.weekIndex).toBe(2)
        expect(mesocycle.microcycleForWeek(3)).toBeNull()
    })

    it('rejects a set programmed with both RPE and RIR', () => {
        const content: MesocycleContentInput = {
            name: MesocycleNameVO.create('Bad'),
            microcycles: [
                {
                    days: [
                        {
                            dayOffset: 0,
                            exercises: [
                                {
                                    exerciseId: 'ex-1',
                                    sets: [{ rpe: RpeRangeVO.create(8), rir: RirRangeVO.create(2) }],
                                },
                            ],
                        },
                    ],
                },
            ],
        }

        expect(() =>
            MesocycleAggregate.create({
                id: uid(),
                ownerId: 'u-1',
                content,
                idFactory: () => uid(),
                now: NOW,
            }),
        ).toThrow(ConflictingIntensityError)
    })

    it('replaces the whole tree and details on replaceContent, touching updatedAt', () => {
        const mesocycle = MesocycleMother.withTree('ex-1', { now: NOW })
        const later = new Date('2026-02-01T00:00:00.000Z')

        mesocycle.replaceContent(
            {
                name: MesocycleNameVO.create('Strength Block'),
                goal: 'strength',
                startDate: new Date('2026-02-02T00:00:00.000Z'),
                microcycles: [
                    {
                        days: [
                            {
                                dayOffset: 2,
                                exercises: [{ exerciseId: 'ex-1', sets: [{ plannedReps: RepsRangeVO.create(3) }] }],
                            },
                        ],
                    },
                ],
            },
            () => uid(),
            later,
        )

        expect(mesocycle.name.value).toBe('Strength Block')
        expect(mesocycle.goal).toBe('strength')
        expect(mesocycle.microcycles).toHaveLength(1)
        expect(mesocycle.microcycles[0]!.days[0]!.dayOffset).toBe(2)
        expect(mesocycle.updatedAt).toEqual(later)
    })

    it('transitions status and touches updatedAt', () => {
        const mesocycle = MesocycleMother.withTree('ex-1', { now: NOW })
        const later = new Date('2026-03-01T00:00:00.000Z')

        mesocycle.setStatus('active', later)

        expect(mesocycle.status).toBe('active')
        expect(mesocycle.updatedAt).toEqual(later)
    })
})
