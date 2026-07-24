import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { Clock } from '../../ports/clock.port'
import { type ExecutionBucketRow, TrainingDashboardReadModel } from '../../ports/training-dashboard.read-model'
import { GetTrainingExecutionSeriesQuery } from './get-training-execution-series.query'

@QueryHandler(GetTrainingExecutionSeriesQuery)
export class GetTrainingExecutionSeriesHandler implements IQueryHandler<
    GetTrainingExecutionSeriesQuery,
    ExecutionBucketRow[]
> {
    constructor(
        private readonly dashboard: TrainingDashboardReadModel,
        private readonly clock: Clock,
    ) {}

    async execute(query: GetTrainingExecutionSeriesQuery): Promise<ExecutionBucketRow[]> {
        // No `previousFrom`: a series shows its own trend over time, so there is
        // nothing to compare a preceding window against.
        return this.dashboard.executionSeries({
            userId: query.userId,
            plannedByUserId: query.plannedByUserId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            now: this.clock.now(),
        })
    }
}
