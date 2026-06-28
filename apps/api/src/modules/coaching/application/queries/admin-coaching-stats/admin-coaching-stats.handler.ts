import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type AdminCoachingStats, AdminCoachingStatsReadModel } from '../../ports/admin-coaching-stats.read-model'
import { AdminCoachingStatsQuery } from './admin-coaching-stats.query'

@QueryHandler(AdminCoachingStatsQuery)
export class AdminCoachingStatsHandler implements IQueryHandler<AdminCoachingStatsQuery, AdminCoachingStats> {
    constructor(private readonly readModel: AdminCoachingStatsReadModel) {}

    async execute(): Promise<AdminCoachingStats> {
        return this.readModel.read()
    }
}
