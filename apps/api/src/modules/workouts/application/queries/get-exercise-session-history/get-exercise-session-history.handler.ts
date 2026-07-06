import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import {
    type ExerciseSessionHistoryRow,
    ExerciseSessionHistoryReadModel,
} from '../../ports/exercise-session-history.read-model'
import { GetExerciseSessionHistoryQuery } from './get-exercise-session-history.query'

/** Default number of past sessions surfaced while logging (kept small for the inline panel). */
const DEFAULT_LIMIT = 3
const MAX_LIMIT = 20

@QueryHandler(GetExerciseSessionHistoryQuery)
export class GetExerciseSessionHistoryHandler implements IQueryHandler<
    GetExerciseSessionHistoryQuery,
    ExerciseSessionHistoryRow[]
> {
    constructor(private readonly history: ExerciseSessionHistoryReadModel) {}

    async execute(query: GetExerciseSessionHistoryQuery): Promise<ExerciseSessionHistoryRow[]> {
        const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

        return this.history.forExercise({
            userId: query.userId,
            exerciseId: query.exerciseId,
            excludeSessionId: query.excludeSessionId ?? undefined,
            limit,
        })
    }
}
