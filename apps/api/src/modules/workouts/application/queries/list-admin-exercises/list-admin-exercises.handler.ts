import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { type ExerciseView, toExerciseView } from '../list-exercises/list-exercises.handler'
import { ListAdminExercisesQuery } from './list-admin-exercises.query'

/** A page of catalog exercises with the total count for the admin listing. */
export interface AdminExercisePageView {
    rows: ExerciseView[]
    total: number
    limit: number
    offset: number
}

@QueryHandler(ListAdminExercisesQuery)
export class ListAdminExercisesHandler implements IQueryHandler<ListAdminExercisesQuery, AdminExercisePageView> {
    constructor(private readonly exercises: ExerciseRepository) {}

    async execute(query: ListAdminExercisesQuery): Promise<AdminExercisePageView> {
        const [found, total] = await Promise.all([
            this.exercises.findAll(query.filter, { limit: query.limit, offset: query.offset }),
            this.exercises.count(query.filter),
        ])

        return {
            rows: found.map(toExerciseView),
            total,
            limit: query.limit,
            offset: query.offset,
        }
    }
}
