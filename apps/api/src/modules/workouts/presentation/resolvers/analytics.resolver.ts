import { UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import type { ExerciseSessionHistoryRow } from '../../application/ports/exercise-session-history.read-model'
import type { ExerciseStatsRow } from '../../application/ports/exercise-stats.read-model'
import type { TrainingDistribution, VolumeBucketRow } from '../../application/ports/training-dashboard.read-model'
import { GetExerciseSessionHistoryQuery } from '../../application/queries/get-exercise-session-history/get-exercise-session-history.query'
import { GetExerciseStatsQuery } from '../../application/queries/get-exercise-stats/get-exercise-stats.query'
import type { StrengthProgressionView } from '../../application/queries/get-strength-progression/get-strength-progression.handler'
import { GetStrengthProgressionQuery } from '../../application/queries/get-strength-progression/get-strength-progression.query'
import type { TrainingSummaryView } from '../../application/queries/get-training-summary/get-training-summary.handler'
import { GetTrainingDistributionQuery } from '../../application/queries/get-training-distribution/get-training-distribution.query'
import { GetTrainingSummaryQuery } from '../../application/queries/get-training-summary/get-training-summary.query'
import { GetVolumeSeriesQuery } from '../../application/queries/get-volume-series/get-volume-series.query'
import { ExerciseSessionHistoryType } from '../types/exercise-session-history.type'
import { ExerciseStatsType } from '../types/exercise-stats.type'
import {
    StrengthProgressionType,
    TrainingDistributionType,
    TrainingSummaryType,
    VolumeBucketType,
} from '../types/training-dashboard.type'

const isoDate = z.string().datetime().optional()
const uuidArg = z.string().uuid()
const optionalUuid = z.string().uuid().optional()
const limitArg = z.number().int().positive().max(20).optional()

@Resolver(() => ExerciseStatsType)
@UseGuards(JwtCookieGuard)
export class AnalyticsResolver {
    constructor(private readonly queryBus: QueryBus) {}

    @Query(() => [ExerciseStatsType], {
        description: "The caller's per-exercise volume and PRs, optionally within a date range.",
    })
    async exerciseStats(
        @CurrentUser() user: AuthUser,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<ExerciseStatsRow[]> {
        const query = new GetExerciseStatsQuery(user.userId, from, to)
        return this.queryBus.execute(query)
    }

    @Query(() => TrainingSummaryType, {
        description: "The caller's headline training KPIs (incl. estimated S+B+D total), optionally ranged.",
    })
    async trainingSummary(
        @CurrentUser() user: AuthUser,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<TrainingSummaryView> {
        const query = new GetTrainingSummaryQuery(user.userId, from, to)
        return this.queryBus.execute(query)
    }

    @Query(() => [VolumeBucketType], {
        description: "The caller's weekly training volume, optionally within a date range.",
    })
    async volumeSeries(
        @CurrentUser() user: AuthUser,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<VolumeBucketRow[]> {
        const query = new GetVolumeSeriesQuery(user.userId, from, to)
        return this.queryBus.execute(query)
    }

    @Query(() => StrengthProgressionType, {
        description: 'e1RM progression and projection for one exercise, optionally within a date range.',
    })
    async strengthProgression(
        @CurrentUser() user: AuthUser,
        @Args('exerciseId', { type: () => ID }, new ZodValidationPipe(uuidArg)) exerciseId: string,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<StrengthProgressionView> {
        const query = new GetStrengthProgressionQuery(user.userId, exerciseId, from, to)
        return this.queryBus.execute(query)
    }

    @Query(() => [ExerciseSessionHistoryType], {
        description: "The caller's recent completed sessions logging one exercise, with their performed sets.",
    })
    async exerciseSessionHistory(
        @CurrentUser() user: AuthUser,
        @Args('exerciseId', { type: () => ID }, new ZodValidationPipe(uuidArg)) exerciseId: string,
        @Args('excludeSessionId', { type: () => ID, nullable: true }, new ZodValidationPipe(optionalUuid))
        excludeSessionId?: string,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
    ): Promise<ExerciseSessionHistoryRow[]> {
        const query = new GetExerciseSessionHistoryQuery(user.userId, exerciseId, excludeSessionId, limit)
        return this.queryBus.execute(query)
    }

    @Query(() => TrainingDistributionType, {
        description: "The caller's volume distribution (muscle/category) and RPE breakdown, optionally ranged.",
    })
    async trainingDistribution(
        @CurrentUser() user: AuthUser,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<TrainingDistribution> {
        const query = new GetTrainingDistributionQuery(user.userId, from, to)
        return this.queryBus.execute(query)
    }
}
