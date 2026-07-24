import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type AdminBillingStats, AdminBillingStatsReadModel } from '../../ports/admin-billing-stats.read-model'
import { AdminBillingStatsQuery } from './admin-billing-stats.query'

@QueryHandler(AdminBillingStatsQuery)
export class AdminBillingStatsHandler implements IQueryHandler<AdminBillingStatsQuery, AdminBillingStats> {
    constructor(private readonly readModel: AdminBillingStatsReadModel) {}

    execute(): Promise<AdminBillingStats> {
        return this.readModel.read()
    }
}
