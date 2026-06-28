import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type AdminUserStats, AdminUserReadModel } from '../../ports/admin-user.read-model'
import { AdminUserStatsQuery } from './admin-user-stats.query'

@QueryHandler(AdminUserStatsQuery)
export class AdminUserStatsHandler implements IQueryHandler<AdminUserStatsQuery, AdminUserStats> {
    constructor(private readonly readModel: AdminUserReadModel) {}

    async execute(): Promise<AdminUserStats> {
        return this.readModel.stats()
    }
}
