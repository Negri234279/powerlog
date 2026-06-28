import { randomUUID } from 'node:crypto'

import {
    type TemplateContentInput,
    WorkoutTemplateAggregate,
} from '../../../src/modules/workouts/domain/entities/workout-template.entity'
import { RepsVO } from '../../../src/modules/workouts/domain/value-objects/reps.vo'
import { RpeVO } from '../../../src/modules/workouts/domain/value-objects/rpe.vo'
import { TemplateNameVO } from '../../../src/modules/workouts/domain/value-objects/template-name.vo'
import { WeightVO } from '../../../src/modules/workouts/domain/value-objects/weight.vo'

const NOW = new Date('2026-01-01T00:00:00.000Z')

interface TemplateOverrides {
    id?: string
    ownerId?: string
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
                        { plannedWeight: WeightVO.create(100), plannedReps: RepsVO.create(5), rpe: RpeVO.create(8) },
                        { plannedWeight: WeightVO.create(90), plannedReps: RepsVO.create(8) },
                    ],
                },
            ],
        }

        return WorkoutTemplateAggregate.create({
            id: overrides.id ?? randomUUID(),
            ownerId: overrides.ownerId ?? randomUUID(),
            content,
            idFactory: () => randomUUID(),
            now: overrides.now ?? NOW,
        })
    },
}
