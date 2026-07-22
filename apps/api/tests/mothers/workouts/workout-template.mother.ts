import { randomUUID } from 'node:crypto'

import {
    type TemplateContentInput,
    type TemplateScope,
    WorkoutTemplateAggregate,
} from '../../../src/modules/workouts/domain/entities/workout-template.entity'
import { RepsRangeVO } from '../../../src/modules/workouts/domain/value-objects/reps-range.vo'
import { RpeRangeVO } from '../../../src/modules/workouts/domain/value-objects/rpe-range.vo'
import { TemplateNameVO } from '../../../src/modules/workouts/domain/value-objects/template-name.vo'
import { WeightRangeVO } from '../../../src/modules/workouts/domain/value-objects/weight-range.vo'

const NOW = new Date('2026-01-01T00:00:00.000Z')

interface TemplateOverrides {
    id?: string
    ownerId?: string
    scope?: TemplateScope
    content?: TemplateContentInput
    now?: Date
}

/** Builds WorkoutTemplate aggregates for tests. */
export const WorkoutTemplateMother = {
    /** A template with one exercise and two programmed sets. */
    withTree(exerciseId: string, overrides: TemplateOverrides = {}): WorkoutTemplateAggregate {
        const content: TemplateContentInput = overrides.content ?? {
            name: TemplateNameVO.create('Upper A'),
            notes: 'Push focus',
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
        }

        return WorkoutTemplateAggregate.create({
            id: overrides.id ?? randomUUID(),
            ownerId: overrides.ownerId ?? randomUUID(),
            scope: overrides.scope,
            content,
            idFactory: () => randomUUID(),
            now: overrides.now ?? NOW,
        })
    },
}
