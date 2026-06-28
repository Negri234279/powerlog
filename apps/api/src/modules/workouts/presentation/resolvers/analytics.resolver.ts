import { UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { Args, ID, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import type { ExerciseStatsRow } from '../../application/ports/exercise-stats.read-model'
import type { TrainingDistribution, VolumeBucketRow } from '../../application/ports/training-dashboard.read-model'
import { GetExerciseStatsQuery } from '../../application/queries/get-exercise-stats/get-exercise-stats.query'
import type { StrengthProgressionView } from '../../application/queries/get-strength-progression/get-strength-progression.handler'
import { GetStrengthProgressionQuery } from '../../application/queries/get-strength-progression/get-strength-progression.query'
import type { TrainingSummaryView } from '../../application/queries/get-training-summary/get-training-summary.handler'
import { GetTrainingDistributionQuery } from '../../application/queries/get-training-distribution/get-training-distribution.query'
import { GetTrainingSummaryQuery } from '../../application/queries/get-training-summary/get-training-summary.query'
import { GetVolumeSeriesQuery } from '../../application/queries/get-volume-series/get-volume-series.query'
import { ExerciseStatsType } from '../types/exercise-stats.type'
import {
    StrengthProgressionType,
    TrainingDistributionType,
    TrainingSummaryType,
    VolumeBucketType,
} from '../types/training-dashboard.type'

const isoDate = z.string().datetime().optional()
const uuidArg = z.string().uuid()

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
        return this.queryBus.execute(new GetExerciseStatsQuery(user.userId, from, to))
    }

    @Query(() => TrainingSummaryType, {
        description: "The caller's headline training KPIs (incl. estimated S+B+D total), optionally ranged.",
    })
    async trainingSummary(
        @CurrentUser() user: AuthUser,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<TrainingSummaryView> {
        return this.queryBus.execute(new GetTrainingSummaryQuery(user.userId, from, to))
    }

    @Query(() => [VolumeBucketType], {
        description: "The caller's weekly training volume, optionally within a date range.",
    })
    async volumeSeries(
        @CurrentUser() user: AuthUser,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<VolumeBucketRow[]> {
        return this.queryBus.execute(new GetVolumeSeriesQuery(user.userId, from, to))
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
        return this.queryBus.execute(new GetStrengthProgressionQuery(user.userId, exerciseId, from, to))
    }

    @Query(() => TrainingDistributionType, {
        description: "The caller's volume distribution (muscle/category) and RPE breakdown, optionally ranged.",
    })
    async trainingDistribution(
        @CurrentUser() user: AuthUser,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<TrainingDistribution> {
        return this.queryBus.execute(new GetTrainingDistributionQuery(user.userId, from, to))
    }
}
