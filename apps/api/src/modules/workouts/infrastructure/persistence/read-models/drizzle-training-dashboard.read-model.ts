import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gte, isNotNull, lte, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type StrengthPointRow,
    type StrengthProgressionFilter,
    type TrainingAnalyticsFilter,
    type TrainingDistribution,
    type TrainingSummaryRow,
    TrainingDashboardReadModel,
    type VolumeBucketRow,
} from '../../../application/ports/training-dashboard.read-model'
import type { ExerciseCategory, ExerciseMuscle } from '../../../domain/exercise-taxonomy'
import { exercises } from '../schema/exercises.schema'
import { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'
import { workoutSessions } from '../schema/workout-sessions.schema'
import { workoutSets } from '../schema/workout-sets.schema'

@Injectable()
export class DrizzleTrainingDashboardReadModel extends TrainingDashboardReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    /** Conditions shared by every aggregation: user scope, range, actual sets. */
    private actualSetConditions(filter: TrainingAnalyticsFilter): SQL[] {
        const conditions: SQL[] = [
            eq(workoutSessions.userId, filter.userId),
            isNotNull(workoutSets.weightKg),
            isNotNull(workoutSets.reps),
        ]

        if (filter.from) {
            conditions.push(gte(workoutSessions.performedAt, filter.from))
        }

        if (filter.to) {
            conditions.push(lte(workoutSessions.performedAt, filter.to))
        }

        return conditions
    }

    async summary(filter: TrainingAnalyticsFilter): Promise<TrainingSummaryRow> {
        const [row] = await this.db
            .select({
                sessions: sql<number>`count(distinct ${workoutSessions.id})::int`,
                trainingDays: sql<number>`count(distinct (${workoutSessions.performedAt})::date)::int`,
                totalSets: sql<number>`count(${workoutSets.id})::int`,
                totalReps: sql<number>`coalesce(sum(${workoutSets.reps}), 0)::int`,
                totalVolumeKg: sql<number>`coalesce(sum(${workoutSets.weightKg} * ${workoutSets.reps}), 0)`,
                avgRpe: sql<number | null>`avg(${workoutSets.rpe})`,
                distinctExercises: sql<number>`count(distinct ${workoutExerciseEntries.exerciseId})::int`,
                bestSquatE1rmKg: sql<
                    number | null
                >`max(${workoutSets.e1rmKg}) filter (where ${exercises.category} = 'squat')`,
                bestBenchE1rmKg: sql<
                    number | null
                >`max(${workoutSets.e1rmKg}) filter (where ${exercises.category} = 'bench')`,
                bestDeadliftE1rmKg: sql<
                    number | null
                >`max(${workoutSets.e1rmKg}) filter (where ${exercises.category} = 'deadlift')`,
            })
            .from(workoutSets)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .innerJoin(exercises, eq(exercises.id, workoutExerciseEntries.exerciseId))
            .where(and(...this.actualSetConditions(filter)))

        // Aggregating over zero rows still yields one row of zeros/nulls.
        return {
            sessions: Number(row?.sessions ?? 0),
            trainingDays: Number(row?.trainingDays ?? 0),
            totalSets: Number(row?.totalSets ?? 0),
            totalReps: Number(row?.totalReps ?? 0),
            totalVolumeKg: Number(row?.totalVolumeKg ?? 0),
            avgRpe: row?.avgRpe == null ? null : Math.round(Number(row.avgRpe) * 10) / 10,
            distinctExercises: Number(row?.distinctExercises ?? 0),
            bestSquatE1rmKg: row?.bestSquatE1rmKg == null ? null : Number(row.bestSquatE1rmKg),
            bestBenchE1rmKg: row?.bestBenchE1rmKg == null ? null : Number(row.bestBenchE1rmKg),
            bestDeadliftE1rmKg: row?.bestDeadliftE1rmKg == null ? null : Number(row.bestDeadliftE1rmKg),
        }
    }

    async volumeSeries(filter: TrainingAnalyticsFilter): Promise<VolumeBucketRow[]> {
        // Monday-anchored ISO weeks (Postgres date_trunc; UTC in our deployments).
        const bucket = sql<Date>`date_trunc('week', ${workoutSessions.performedAt})`
        const rows = await this.db
            .select({
                bucketStart: bucket,
                totalVolumeKg: sql<number>`coalesce(sum(${workoutSets.weightKg} * ${workoutSets.reps}), 0)`,
                totalSets: sql<number>`count(${workoutSets.id})::int`,
                sessions: sql<number>`count(distinct ${workoutSessions.id})::int`,
            })
            .from(workoutSets)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .where(and(...this.actualSetConditions(filter)))
            .groupBy(bucket)
            .orderBy(bucket)

        return rows.map((row) => ({
            bucketStart: new Date(row.bucketStart),
            totalVolumeKg: Number(row.totalVolumeKg),
            totalSets: Number(row.totalSets),
            sessions: Number(row.sessions),
        }))
    }

    async strengthSeries(filter: StrengthProgressionFilter): Promise<StrengthPointRow[]> {
        const conditions = [
            eq(workoutSessions.userId, filter.userId),
            eq(workoutExerciseEntries.exerciseId, filter.exerciseId),
            isNotNull(workoutSets.e1rmKg),
        ]

        if (filter.from) {
            conditions.push(gte(workoutSessions.performedAt, filter.from))
        }

        if (filter.to) {
            conditions.push(lte(workoutSessions.performedAt, filter.to))
        }

        // One point per session: its best (top) e1RM for the exercise.
        const rows = await this.db
            .select({
                performedAt: workoutSessions.performedAt,
                e1rmKg: sql<number>`max(${workoutSets.e1rmKg})`,
            })
            .from(workoutSets)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .where(and(...conditions))
            .groupBy(workoutSessions.id, workoutSessions.performedAt)
            .orderBy(workoutSessions.performedAt)

        return rows.map((row) => ({ performedAt: new Date(row.performedAt), e1rmKg: Number(row.e1rmKg) }))
    }

    async distribution(filter: TrainingAnalyticsFilter): Promise<TrainingDistribution> {
        const volume = sql<number>`coalesce(sum(${workoutSets.weightKg} * ${workoutSets.reps}), 0)`
        const setCount = sql<number>`count(${workoutSets.id})::int`
        const base = (groupCol: typeof exercises.primaryMuscle | typeof exercises.category) =>
            this.db
                .select({ key: groupCol, totalVolumeKg: volume, totalSets: setCount })
                .from(workoutSets)
                .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
                .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
                .innerJoin(exercises, eq(exercises.id, workoutExerciseEntries.exerciseId))
                .where(and(...this.actualSetConditions(filter)))
                .groupBy(groupCol)
                .orderBy(desc(volume))

        // RPE rounds to the nearest integer; RIR is already a whole number. A set
        // records at most one, so the two series never double-count.
        const intensity = (bucket: SQL<number>, column: typeof workoutSets.rpe | typeof workoutSets.rir) =>
            this.db
                .select({ value: bucket, sets: sql<number>`count(${workoutSets.id})::int` })
                .from(workoutSets)
                .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
                .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
                .where(and(...this.actualSetConditions(filter), isNotNull(column)))
                .groupBy(bucket)
                .orderBy(bucket)

        const [byMuscle, byCategory, rpe, rir] = await Promise.all([
            base(exercises.primaryMuscle),
            base(exercises.category),
            intensity(sql<number>`round(${workoutSets.rpe})::int`, workoutSets.rpe),
            intensity(sql<number>`${workoutSets.rir}::int`, workoutSets.rir),
        ])

        return {
            byMuscle: byMuscle.map((r) => ({
                key: r.key as ExerciseMuscle,
                totalVolumeKg: Number(r.totalVolumeKg),
                totalSets: Number(r.totalSets),
            })),
            byCategory: byCategory.map((r) => ({
                key: r.key as ExerciseCategory,
                totalVolumeKg: Number(r.totalVolumeKg),
                totalSets: Number(r.totalSets),
            })),
            rpe: rpe.map((r) => ({ value: Number(r.value), sets: Number(r.sets) })),
            rir: rir.map((r) => ({ value: Number(r.value), sets: Number(r.sets) })),
        }
    }
}
