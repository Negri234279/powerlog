import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type ExerciseStatsRow, ExerciseStatsReadModel } from '../../ports/exercise-stats.read-model'
import { GetExerciseStatsQuery } from './get-exercise-stats.query'

@QueryHandler(GetExerciseStatsQuery)
export class GetExerciseStatsHandler implements IQueryHandler<GetExerciseStatsQuery, ExerciseStatsRow[]> {
    constructor(private readonly stats: ExerciseStatsReadModel) {}

    async execute(query: GetExerciseStatsQuery): Promise<ExerciseStatsRow[]> {
        return this.stats.perExercise({
            userId: query.userId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            locale: query.locale,
        })
    }
}
