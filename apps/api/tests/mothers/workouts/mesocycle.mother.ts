import { randomUUID } from 'node:crypto'

import {
    type MesocycleContentInput,
    MesocycleAggregate,
} from '../../../src/modules/workouts/domain/entities/mesocycle.entity'
import { MesocycleNameVO } from '../../../src/modules/workouts/domain/value-objects/mesocycle-name.vo'
import { RepsRangeVO } from '../../../src/modules/workouts/domain/value-objects/reps-range.vo'
import { RpeRangeVO } from '../../../src/modules/workouts/domain/value-objects/rpe-range.vo'
import { WeightRangeVO } from '../../../src/modules/workouts/domain/value-objects/weight-range.vo'

const NOW = new Date('2026-01-01T00:00:00.000Z')

interface MesocycleOverrides {
    id?: string
    ownerId?: string
    /** Coach who plans the block for the owner (null/absent = self-made). */
    plannedByUserId?: string | null
    content?: MesocycleContentInput
    now?: Date
}

/** Builds Mesocycle aggregates for tests. */
export const MesocycleMother = {
    /**
     * A 2-week mesocycle with one training day per week (top set + backoff in week
     * 1, a heavier top set in week 2). `startDate` anchors week 1 for generation.
     */
    withTree(exerciseId: string, overrides: MesocycleOverrides = {}): MesocycleAggregate {
        const content: MesocycleContentInput = overrides.content ?? {
            name: MesocycleNameVO.create('Hypertrophy Block'),
            notes: 'Accumulation',
            goal: 'hypertrophy',
            startDate: new Date('2026-01-05T00:00:00.000Z'),
            microcycles: [
                {
                    label: 'Week 1',
                    days: [
                        {
                            dayOffset: 0,
                            label: 'Day 1',
                            exercises: [
                                {
                                    exerciseId,
                                    notes: 'top set then backoff',
                                    sets: [
                                        {
                                            plannedWeight: WeightRangeVO.create(100),
                                            plannedReps: RepsRangeVO.create(5),
                                            rpe: RpeRangeVO.create(8),
                                        },
                                        { plannedWeight: WeightRangeVO.create(90), plannedReps: RepsRangeVO.create(8) },
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
                            label: 'Day 1',
                            exercises: [
                                {
                                    exerciseId,
                                    sets: [
                                        {
                                            plannedWeight: WeightRangeVO.create(105),
                                            plannedReps: RepsRangeVO.create(5),
                                            rpe: RpeRangeVO.create(8),
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        }

        return MesocycleAggregate.create({
            id: overrides.id ?? randomUUID(),
            ownerId: overrides.ownerId ?? randomUUID(),
            plannedByUserId: overrides.plannedByUserId ?? null,
            content,
            idFactory: () => randomUUID(),
            now: overrides.now ?? NOW,
        })
    },
}
