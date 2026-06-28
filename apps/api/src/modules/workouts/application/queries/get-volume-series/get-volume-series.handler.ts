import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type VolumeBucketRow, TrainingDashboardReadModel } from '../../ports/training-dashboard.read-model'
import { GetVolumeSeriesQuery } from './get-volume-series.query'

@QueryHandler(GetVolumeSeriesQuery)
export class GetVolumeSeriesHandler implements IQueryHandler<GetVolumeSeriesQuery, VolumeBucketRow[]> {
    constructor(private readonly dashboard: TrainingDashboardReadModel) {}

    async execute(query: GetVolumeSeriesQuery): Promise<VolumeBucketRow[]> {
        return this.dashboard.volumeSeries({
            userId: query.userId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
        })
    }
}
