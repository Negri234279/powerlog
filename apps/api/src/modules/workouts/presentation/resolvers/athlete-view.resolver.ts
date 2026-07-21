import { UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { Roles } from '../../../../auth/roles.decorator'
import { RolesGuard } from '../../../../auth/roles.guard'
import { toSupportedLocale } from '../../../../shared/i18n/locale'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import type { ExerciseSessionHistoryRow } from '../../application/ports/exercise-session-history.read-model'
import type { ExerciseStatsRow } from '../../application/ports/exercise-stats.read-model'
import type { MesocycleSummaryRow } from '../../application/ports/mesocycle-list.read-model'
import type {
    ExecutionBucketRow,
    TrainingDistribution,
    VolumeBucketRow,
} from '../../application/ports/training-dashboard.read-model'
import { GetAthleteExecutionSeriesQuery } from '../../application/queries/get-athlete-execution-series/get-athlete-execution-series.query'
import type { AthleteExecutionView } from '../../application/queries/get-athlete-execution/get-athlete-execution.handler'
import { GetAthleteExecutionQuery } from '../../application/queries/get-athlete-execution/get-athlete-execution.query'
import { GetExerciseSessionHistoryQuery } from '../../application/queries/get-exercise-session-history/get-exercise-session-history.query'
import { GetExerciseStatsQuery } from '../../application/queries/get-exercise-stats/get-exercise-stats.query'
import type { MesocycleView } from '../../application/queries/get-mesocycle/get-mesocycle.handler'
import { GetMesocycleQuery } from '../../application/queries/get-mesocycle/get-mesocycle.query'
import type { StrengthProgressionView } from '../../application/queries/get-strength-progression/get-strength-progression.handler'
import { GetStrengthProgressionQuery } from '../../application/queries/get-strength-progression/get-strength-progression.query'
import { GetTrainingDistributionQuery } from '../../application/queries/get-training-distribution/get-training-distribution.query'
import type { TrainingSummaryView } from '../../application/queries/get-training-summary/get-training-summary.handler'
import { GetTrainingSummaryQuery } from '../../application/queries/get-training-summary/get-training-summary.query'
import { GetVolumeSeriesQuery } from '../../application/queries/get-volume-series/get-volume-series.query'
import type { WorkoutSessionView } from '../../application/queries/get-workout-session/get-workout-session.handler'
import { GetWorkoutSessionQuery } from '../../application/queries/get-workout-session/get-workout-session.query'
import { ListMesocyclesQuery } from '../../application/queries/list-mesocycles/list-mesocycles.query'
import type { WorkoutHistoryPage } from '../../application/queries/list-workout-sessions/list-workout-sessions.handler'
import { ListWorkoutSessionsQuery } from '../../application/queries/list-workout-sessions/list-workout-sessions.query'
import { WORKOUT_STATUSES, type WorkoutStatus } from '../../domain/workout-status'
import { LinkedAthleteGuard } from '../guards/linked-athlete.guard'
import { ExerciseSessionHistoryType } from '../types/exercise-session-history.type'
import { ExerciseStatsType } from '../types/exercise-stats.type'
import { MesocycleSummaryType, MesocycleType } from '../types/mesocycle.type'
import {
    AthleteExecutionType,
    ExecutionBucketType,
    StrengthProgressionType,
    TrainingDistributionType,
    TrainingSummaryType,
    VolumeBucketType,
} from '../types/training-dashboard.type'
import { WorkoutHistoryPageType } from '../types/workout-history.type'
import { WorkoutSessionType } from '../types/workout-session.type'

const uuidArg = z.string().uuid()
const isoDate = z.string().datetime().optional()
const limitArg = z.coerce.number().int().min(1).max(50).optional()
const statusArg = z.enum(WORKOUT_STATUSES).optional()
const optionalUuid = z.string().uuid().optional()
const searchArg = z.string().trim().min(1).max(100).optional()
const cursorArg = z.string().min(1).optional()

const DEFAULT_HISTORY_LIMIT = 20

/**
 * The coach's read-only window onto one athlete's training. Every field takes an
 * `athleteId` and runs the athlete's own query with `userId = athleteId` — the
 * read models are reused as-is; `LinkedAthleteGuard` is what makes it safe.
 *
 * Writing stays elsewhere: the coach only manages the sessions they planned.
 */
@Resolver()
@UseGuards(JwtCookieGuard, RolesGuard, LinkedAthleteGuard)
@Roles('coach')
export class AthleteViewResolver {
    constructor(private readonly queryBus: QueryBus) {}

    @Query(() => WorkoutHistoryPageType, {
        description: "An athlete's session history, newest first (same filters as your own history; coaches only).",
    })
    async athleteWorkoutHistory(
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('status', { type: () => String, nullable: true }, new ZodValidationPipe(statusArg))
        status?: WorkoutStatus,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
        @Args('exerciseId', { type: () => ID, nullable: true }, new ZodValidationPipe(optionalUuid))
        exerciseId?: string,
        @Args('query', { type: () => String, nullable: true }, new ZodValidationPipe(searchArg)) query?: string,
        @Args('cursor', { type: () => String, nullable: true }, new ZodValidationPipe(cursorArg)) cursor?: string,
    ): Promise<WorkoutHistoryPage> {
        const listQuery = new ListWorkoutSessionsQuery(
            athleteId,
            limit ?? DEFAULT_HISTORY_LIMIT,
            status,
            from,
            to,
            exerciseId,
            query,
            cursor,
        )
        return this.queryBus.execute(listQuery)
    }

    @Query(() => WorkoutSessionType, {
        description: "One of an athlete's sessions, with its full tree (coaches only).",
    })
    async athleteWorkoutSession(
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<WorkoutSessionView> {
        const query = new GetWorkoutSessionQuery(athleteId, id)
        return this.queryBus.execute(query)
    }

    @Query(() => [MesocycleSummaryType], {
        description: "An athlete's mesocycles (newest first), with cheap rollups (coaches only).",
    })
    async athleteMesocycles(
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('search', { type: () => String, nullable: true }, new ZodValidationPipe(searchArg)) search?: string,
    ): Promise<MesocycleSummaryRow[]> {
        const query = new ListMesocyclesQuery(athleteId, search)
        return this.queryBus.execute(query)
    }

    @Query(() => MesocycleType, { description: "One of an athlete's mesocycles, with its full tree (coaches only)." })
    async athleteMesocycle(
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<MesocycleView> {
        const query = new GetMesocycleQuery(athleteId, id)
        return this.queryBus.execute(query)
    }

    @Query(() => TrainingSummaryType, {
        description: "An athlete's headline training KPIs (incl. estimated S+B+D total), optionally ranged.",
    })
    async athleteTrainingSummary(
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<TrainingSummaryView> {
        const query = new GetTrainingSummaryQuery(athleteId, from, to)
        return this.queryBus.execute(query)
    }

    @Query(() => AthleteExecutionType, {
        description:
            "How an athlete is executing: adherence to THIS coach's programming, set outcomes and load compliance across all their training, plus period-over-period trends (coaches only).",
    })
    async athleteExecution(
        @CurrentUser() user: AuthUser,
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<AthleteExecutionView> {
        // Adherence is measured against what the *caller* programmed, so the same
        // athlete scores differently for two coaches — deliberately.
        const query = new GetAthleteExecutionQuery(athleteId, user.userId, from, to)
        return this.queryBus.execute(query)
    }

    @Query(() => [ExecutionBucketType], {
        description:
            "An athlete's adherence and programmed-vs-executed load, week by week — when they slipped, not just how much (coaches only).",
    })
    async athleteExecutionSeries(
        @CurrentUser() user: AuthUser,
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<ExecutionBucketRow[]> {
        const query = new GetAthleteExecutionSeriesQuery(athleteId, user.userId, from, to)
        return this.queryBus.execute(query)
    }

    @Query(() => [ExerciseStatsType], {
        description: "An athlete's per-exercise volume and PRs, optionally within a date range (coaches only).",
    })
    async athleteExerciseStats(
        @CurrentUser() user: AuthUser,
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<ExerciseStatsRow[]> {
        // Exercise names come back in the coach's locale, not the athlete's.
        const query = new GetExerciseStatsQuery(athleteId, from, to, toSupportedLocale(user.locale))
        return this.queryBus.execute(query)
    }

    @Query(() => [VolumeBucketType], {
        description: "An athlete's weekly training volume, optionally within a date range (coaches only).",
    })
    async athleteVolumeSeries(
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<VolumeBucketRow[]> {
        const query = new GetVolumeSeriesQuery(athleteId, from, to)
        return this.queryBus.execute(query)
    }

    @Query(() => TrainingDistributionType, {
        description: "An athlete's volume distribution (muscle/category) and RPE breakdown (coaches only).",
    })
    async athleteTrainingDistribution(
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<TrainingDistribution> {
        const query = new GetTrainingDistributionQuery(athleteId, from, to)
        return this.queryBus.execute(query)
    }

    @Query(() => [ExerciseSessionHistoryType], {
        description:
            "An athlete's recent completed sessions logging one exercise, with their performed sets (coaches only).",
    })
    async athleteExerciseSessionHistory(
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('exerciseId', { type: () => ID }, new ZodValidationPipe(uuidArg)) exerciseId: string,
        @Args('excludeSessionId', { type: () => ID, nullable: true }, new ZodValidationPipe(optionalUuid))
        excludeSessionId?: string,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
    ): Promise<ExerciseSessionHistoryRow[]> {
        // The previous marks a coach needs while programming are the ATHLETE's, not
        // their own — same read model, run with userId = athleteId.
        const query = new GetExerciseSessionHistoryQuery(athleteId, exerciseId, excludeSessionId, limit)

        return this.queryBus.execute(query)
    }

    @Query(() => StrengthProgressionType, {
        description: "An athlete's e1RM progression and projection for one exercise (coaches only).",
    })
    async athleteStrengthProgression(
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('exerciseId', { type: () => ID }, new ZodValidationPipe(uuidArg)) exerciseId: string,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<StrengthProgressionView> {
        const query = new GetStrengthProgressionQuery(athleteId, exerciseId, from, to)
        return this.queryBus.execute(query)
    }
}
