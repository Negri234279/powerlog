import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { ExerciseEntity } from '../../../domain/entities/exercise.entity'
import type { ExerciseCategory, ExerciseEquipment, ExerciseMuscle } from '../../../domain/exercise-taxonomy'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { ListExercisesQuery } from './list-exercises.query'

/** Read model for a catalog exercise (decoupled from the entity). */
export interface ExerciseView {
    id: string
    slug: string
    name: string
    category: ExerciseCategory
    equipment: ExerciseEquipment
    primaryMuscle: ExerciseMuscle
}

export function toExerciseView(exercise: ExerciseEntity): ExerciseView {
    return {
        id: exercise.id,
        slug: exercise.slug,
        name: exercise.name,
        category: exercise.category,
        equipment: exercise.equipment,
        primaryMuscle: exercise.primaryMuscle,
    }
}

@QueryHandler(ListExercisesQuery)
export class ListExercisesHandler implements IQueryHandler<ListExercisesQuery, ExerciseView[]> {
    constructor(private readonly exercises: ExerciseRepository) {}

    async execute(query: ListExercisesQuery): Promise<ExerciseView[]> {
        const found = await this.exercises.findAll(query.category ? { categories: [query.category] } : undefined)
        return found.map(toExerciseView)
    }
}
