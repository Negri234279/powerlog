import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { type ExerciseView, toExerciseView } from '../list-exercises/list-exercises.handler'
import { ListAdminExercisesQuery } from './list-admin-exercises.query'

/** An admin catalog row: the canonical (English) view + the raw Spanish name, if any. */
export interface AdminExerciseView extends ExerciseView {
    nameEs: string | null
}

/** A page of catalog exercises with the total count for the admin listing. */
export interface AdminExercisePageView {
    rows: AdminExerciseView[]
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

        // Admin rows show the canonical English name + the editable Spanish name.
        const translations = await this.exercises.translationsFor(
            found.map((exercise) => exercise.id),
            'es',
        )

        return {
            rows: found.map((exercise) => ({
                ...toExerciseView(exercise),
                nameEs: translations.get(exercise.id) ?? null,
            })),
            total,
            limit: query.limit,
            offset: query.offset,
        }
    }
}
