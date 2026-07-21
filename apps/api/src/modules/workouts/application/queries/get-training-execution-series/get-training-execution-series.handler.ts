import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { Clock } from '../../ports/clock.port'
import { type ExecutionBucketRow, TrainingDashboardReadModel } from '../../ports/training-dashboard.read-model'
import { GetAthleteExecutionSeriesQuery } from './get-athlete-execution-series.query'

@QueryHandler(GetAthleteExecutionSeriesQuery)
export class GetAthleteExecutionSeriesHandler implements IQueryHandler<
    GetAthleteExecutionSeriesQuery,
    ExecutionBucketRow[]
> {
    constructor(
        private readonly dashboard: TrainingDashboardReadModel,
        private readonly clock: Clock,
    ) {}

    async execute(query: GetAthleteExecutionSeriesQuery): Promise<ExecutionBucketRow[]> {
        // No `previousFrom`: a series shows its own trend over time, so there is
        // nothing to compare a preceding window against.
        return this.dashboard.executionSeries({
            userId: query.athleteId,
            plannedByUserId: query.coachId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            now: this.clock.now(),
        })
    }
}
