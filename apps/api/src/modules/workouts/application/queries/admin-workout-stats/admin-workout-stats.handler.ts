import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type AdminWorkoutStats, AdminWorkoutStatsReadModel } from '../../ports/admin-workout-stats.read-model'
import { AdminWorkoutStatsQuery } from './admin-workout-stats.query'

@QueryHandler(AdminWorkoutStatsQuery)
export class AdminWorkoutStatsHandler implements IQueryHandler<AdminWorkoutStatsQuery, AdminWorkoutStats> {
    constructor(private readonly readModel: AdminWorkoutStatsReadModel) {}

    async execute(): Promise<AdminWorkoutStats> {
        return this.readModel.read()
    }
}
