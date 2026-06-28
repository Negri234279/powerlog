import { UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { Query, Resolver } from '@nestjs/graphql'

import { AdminGuard } from '../../../../auth/admin.guard'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import type { AdminWorkoutStats } from '../../application/ports/admin-workout-stats.read-model'
import { AdminWorkoutStatsQuery } from '../../application/queries/admin-workout-stats/admin-workout-stats.query'
import { AdminWorkoutStatsType } from '../types/admin-workout-stats.type'

/** Admin-only training aggregates for the dashboard. */
@Resolver(() => AdminWorkoutStatsType)
@UseGuards(JwtCookieGuard, AdminGuard)
export class AdminWorkoutResolver {
    constructor(private readonly queryBus: QueryBus) {}

    @Query(() => AdminWorkoutStatsType, { description: 'Aggregate training counts (admin only).' })
    async adminWorkoutStats(): Promise<AdminWorkoutStats> {
        return this.queryBus.execute<AdminWorkoutStatsQuery, AdminWorkoutStats>(new AdminWorkoutStatsQuery())
    }
}
