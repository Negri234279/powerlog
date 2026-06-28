import { UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { Query, Resolver } from '@nestjs/graphql'

import { AdminGuard } from '../../../../auth/admin.guard'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import type { AdminCoachingStats } from '../../application/ports/admin-coaching-stats.read-model'
import { AdminCoachingStatsQuery } from '../../application/queries/admin-coaching-stats/admin-coaching-stats.query'
import { AdminCoachingStatsType } from '../types/admin-coaching-stats.type'

/** Admin-only coaching aggregates for the dashboard. */
@Resolver(() => AdminCoachingStatsType)
@UseGuards(JwtCookieGuard, AdminGuard)
export class AdminCoachingResolver {
    constructor(private readonly queryBus: QueryBus) {}

    @Query(() => AdminCoachingStatsType, { description: 'Aggregate coaching counts (admin only).' })
    async adminCoachingStats(): Promise<AdminCoachingStats> {
        return this.queryBus.execute<AdminCoachingStatsQuery, AdminCoachingStats>(new AdminCoachingStatsQuery())
    }
}
