import { randomUUID } from 'node:crypto'

import { ExerciseEntity, type ExerciseProps } from '../../../src/modules/workouts/domain/entities/exercise.entity'

/** Builds `ExerciseEntity` instances for tests (defaults to a back squat). */
export const ExerciseMother = {
    create(overrides: Partial<ExerciseProps> = {}): ExerciseEntity {
        return ExerciseEntity.rehydrate({
            id: overrides.id ?? randomUUID(),
            slug: overrides.slug ?? 'back-squat',
            name: overrides.name ?? 'Back Squat',
            category: overrides.category ?? 'squat',
            equipment: overrides.equipment ?? 'barbell',
            primaryMuscle: overrides.primaryMuscle ?? 'quads',
        })
    },
}
