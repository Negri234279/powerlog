import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type TrainingDistribution, TrainingDashboardReadModel } from '../../ports/training-dashboard.read-model'
import { GetTrainingDistributionQuery } from './get-training-distribution.query'

@QueryHandler(GetTrainingDistributionQuery)
export class GetTrainingDistributionHandler implements IQueryHandler<
    GetTrainingDistributionQuery,
    TrainingDistribution
> {
    constructor(private readonly dashboard: TrainingDashboardReadModel) {}

    async execute(query: GetTrainingDistributionQuery): Promise<TrainingDistribution> {
        return this.dashboard.distribution({
            userId: query.userId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
        })
    }
}
