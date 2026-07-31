import { describe, expect, it } from 'vitest'

import type { DraftMesocycleDay, DraftMesocycleSet, MesocycleProgression } from './entities/ai-mesocycle-draft.entity'
import { DEFAULT_PROGRESSION } from './entities/ai-mesocycle-draft.entity'
import { type ExpansionContext, expandMicrocycles } from './mesocycle-expander'

const set = (overrides: Partial<DraftMesocycleSet> = {}): DraftMesocycleSet => ({
    order: 1,
    plannedWeightKg: 150,
    plannedReps: 5,
    rpe: 8,
    rir: null,
    notes: null,
    ...overrides,
})

const templateWith = (slug: string, sets: DraftMesocycleSet[]): DraftMesocycleDay[] => [
    { dayOffset: 0, label: null, exercises: [{ exerciseId: `id-${slug}`, slug, name: slug, notes: null, sets }] },
]

const context = (overrides: Partial<ExpansionContext> = {}): ExpansionContext => ({
    e1rmBySlug: new Map([['squat', 200]]),
    equipmentBySlug: new Map([['squat', 'barbell']]),
    categoryBySlug: new Map([['squat', 'squat']]),
    ...overrides,
})

const progression = (overrides: Partial<MesocycleProgression> = {}): MesocycleProgression => ({
    ...DEFAULT_PROGRESSION,
    ...overrides,
})

const firstExercise = (microcycle: { days: DraftMesocycleDay[] }) => microcycle.days[0]!.exercises[0]!

describe('expandMicrocycles', () => {
    it('reproduces the template unchanged under the neutral progression', () => {
        const template = templateWith('squat', [set({ plannedWeightKg: 150 }), set({ plannedWeightKg: 140, order: 2 })])

        const weeks = expandMicrocycles(template, DEFAULT_PROGRESSION, 3, context())

        expect(weeks).toHaveLength(3)
        for (const week of weeks) {
            expect(week.isDeload).toBe(false)
            expect(firstExercise(week).sets.map((s) => s.plannedWeightKg)).toEqual([150, 140])
        }
    })

    it('climbs the load each week for linear_percent, rounded to the increment and capped at the e1RM', () => {
        const template = templateWith('squat', [set({ plannedWeightKg: 150 })])
        const prog = progression({ model: 'linear_percent', weeklyIntensityStepPct: 2.5 })

        const weeks = expandMicrocycles(template, prog, 3, context())

        expect(firstExercise(weeks[0]!).sets[0]?.plannedWeightKg).toBe(150) // step 0
        expect(firstExercise(weeks[1]!).sets[0]?.plannedWeightKg).toBe(155) // 150 × 1.025 → 153.75 → 155
        expect(firstExercise(weeks[2]!).sets[0]?.plannedWeightKg).toBe(157.5) // 150 × 1.05 → 157.5
    })

    it('trims volume and holds the base load on a deload week', () => {
        const template = templateWith('squat', [set(), set({ order: 2 }), set({ order: 3 }), set({ order: 4 })])
        const prog = progression({ weeklyIntensityStepPct: 5, deloadWeeks: [3], deloadFactor: 0.5 })

        const weeks = expandMicrocycles(template, prog, 4, context())

        expect(weeks[3]?.isDeload).toBe(true)
        expect(firstExercise(weeks[3]!).sets).toHaveLength(2) // 4 × 0.5
        expect(firstExercise(weeks[3]!).sets[0]?.plannedWeightKg).toBe(150) // base load, not progressed
    })

    it('adds sets to a compound each working week, but not to an isolation lift', () => {
        const template = [
            {
                dayOffset: 0,
                label: null,
                exercises: [
                    {
                        exerciseId: 'id-squat',
                        slug: 'squat',
                        name: 'squat',
                        notes: null,
                        sets: [set(), set({ order: 2 })],
                    },
                    {
                        exerciseId: 'id-curl',
                        slug: 'curl',
                        name: 'curl',
                        notes: null,
                        sets: [set(), set({ order: 2 })],
                    },
                ],
            },
        ]
        const ctx = context({
            equipmentBySlug: new Map([
                ['squat', 'barbell'],
                ['curl', 'dumbbell'],
            ]),
            categoryBySlug: new Map([
                ['squat', 'squat'],
                ['curl', 'arms'],
            ]),
            e1rmBySlug: new Map([['squat', 200]]),
        })
        const prog = progression({ weeklySetIncrement: 1 })

        const weeks = expandMicrocycles(template, prog, 3, ctx)

        expect(weeks[0]!.days[0]!.exercises[0]!.sets).toHaveLength(2)
        expect(weeks[2]!.days[0]!.exercises[0]!.sets).toHaveLength(4) // squat: 2 + 1×2
        expect(weeks[2]!.days[0]!.exercises[1]!.sets).toHaveLength(2) // curl: unchanged
    })

    it('climbs the RPE and recomputes the load from the e1RM for rpe_ramp', () => {
        const template = templateWith('squat', [set({ plannedWeightKg: 150, plannedReps: 5, rpe: 8 })])
        const prog = progression({ model: 'rpe_ramp' })

        const weeks = expandMicrocycles(template, prog, 2, context())

        const week1 = firstExercise(weeks[1]!).sets[0]!
        expect(week1.rpe).toBe(9) // 8 + 1
        // 5 reps @ RPE 9 → 6 RTF → 83.7% of 200 = 167.4 → nearest 2.5 → 167.5.
        expect(week1.plannedWeightKg).toBe(167.5)
    })

    it('adds reps over the base for double_progression, holding the load', () => {
        const template = templateWith('squat', [set({ plannedReps: 5, plannedWeightKg: 150 })])
        const prog = progression({ model: 'double_progression' })

        const weeks = expandMicrocycles(template, prog, 3, context())

        expect(firstExercise(weeks[2]!).sets[0]?.plannedReps).toBe(7) // 5 + 2
        expect(firstExercise(weeks[2]!).sets[0]?.plannedWeightKg).toBe(150) // load held
    })

    it('does not advance the load across a deload week', () => {
        const template = templateWith('squat', [set({ plannedWeightKg: 100 })])
        const prog = progression({ model: 'linear_percent', weeklyIntensityStepPct: 10, deloadWeeks: [1] })

        const weeks = expandMicrocycles(template, prog, 3, context({ e1rmBySlug: new Map([['squat', 500]]) }))

        // Week 2 is the second WORKING week (week 1 was a deload), so step = 1 → +10%.
        expect(firstExercise(weeks[2]!).sets[0]?.plannedWeightKg).toBe(110)
    })
})
