import { ExerciseEntity } from '../../../domain/entities/exercise.entity'
import type { exercises } from '../schema/exercises.schema'

type ExerciseRow = typeof exercises.$inferSelect
type ExerciseInsert = typeof exercises.$inferInsert

/** Maps between an `exercises` row and the domain entity. */
export const ExerciseMapper = {
    toDomain(row: ExerciseRow): ExerciseEntity {
        return ExerciseEntity.rehydrate({
            id: row.id,
            slug: row.slug,
            name: row.name,
            category: row.category,
            equipment: row.equipment,
            primaryMuscle: row.primaryMuscle,
        })
    },

    toRow(exercise: ExerciseEntity): ExerciseInsert {
        return {
            id: exercise.id,
            slug: exercise.slug,
            name: exercise.name,
            category: exercise.category,
            equipment: exercise.equipment,
            primaryMuscle: exercise.primaryMuscle,
        }
    },
}
