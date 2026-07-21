import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gte, isNotNull, isNull, lt, lte, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type ExecutionBucketRow,
    type ExecutionFilter,
    type ExecutionRow,
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

    /**
     * Adherence, set outcomes, load compliance and period-over-period trends.
     *
     * Three queries rather than one because they can't share a FROM. Adherence
     * has to see sessions that were planned and never touched, and those have no
     * qualifying sets — the set-joined aggregations above (`summary`, and every
     * other method here) structurally cannot count them: the inner join drops
     * the row. The all-time bounds can't share either, since they must survive
     * the range filter that defines the other two.
     *
     * Current and previous windows come back from one pass each via FILTER, so
     * the trend costs no extra round trip.
     */
    async execution(filter: ExecutionFilter): Promise<ExecutionRow> {
        const { from, to, previousFrom } = filter

        // The union of both windows, so one scan serves current + previous. Only
        // the set-joined query narrows this way; the session-level one can't (see
        // below), and it doesn't need to — it reads one row per session.
        const widest: SQL[] = [eq(workoutSessions.userId, filter.userId)]
        const lowerBound = previousFrom ?? from
        if (lowerBound) widest.push(gte(workoutSessions.performedAt, lowerBound))
        if (to) widest.push(lte(workoutSessions.performedAt, to))

        const inRange: SQL[] = []
        if (from) inRange.push(gte(workoutSessions.performedAt, from))
        if (to) inRange.push(lte(workoutSessions.performedAt, to))

        // An unbounded range filters nothing, but FILTER still needs a predicate.
        const rangeOnly: SQL = inRange.length > 0 ? and(...inRange)! : sql`true`

        // `previousFrom` absent ⇒ unbounded range ⇒ no preceding window at all.
        // `false` keeps the FILTER valid while matching nothing.
        const inPrevious: SQL = previousFrom
            ? and(gte(workoutSessions.performedAt, previousFrom), lt(workoutSessions.performedAt, from!))!
            : sql`false`

        const completed = eq(workoutSessions.status, 'completed')
        // No planner scope ⇒ every planned session counts, self-written included
        // (those carry a NULL planner, so an equality test would drop them).
        const inScope: SQL = filter.plannedByUserId
            ? eq(workoutSessions.plannedByUserId, filter.plannedByUserId)
            : sql`true`
        const countWhere = (...parts: SQL[]) => sql<number>`count(*) filter (where ${and(...parts)})::int`
        const ranged = (...parts: SQL[]) => and(...parts, ...inRange)!

        const sessionAggregates = this.db
            .select({
                plannedCompleted: countWhere(ranged(completed, inScope)),
                plannedMissed: countWhere(
                    ranged(eq(workoutSessions.status, 'planned'), inScope, lt(workoutSessions.performedAt, filter.now)),
                ),
                // Not `ranged`: see ExecutionRow.plannedUpcoming.
                plannedUpcoming: countWhere(
                    and(eq(workoutSessions.status, 'planned'), inScope, gte(workoutSessions.performedAt, filter.now))!,
                ),
                completedSessions: countWhere(ranged(completed)),
                previousCompletedSessions: countWhere(and(completed, inPrevious)!),
            })
            .from(workoutSessions)
            // Scoped to the athlete and nothing else: every window lives in a
            // FILTER instead. A `to` in this WHERE would drop the future sessions
            // `plannedUpcoming` exists to count — a range ending today would scan
            // them away before the FILTER ever saw them.
            .where(eq(workoutSessions.userId, filter.userId))

        // Sets carry no date of their own — every window test rides on the
        // session they belong to, hence the same two joins as everywhere else.
        const volume = sql`${workoutSets.weightKg} * ${workoutSets.reps}`
        const plannedLoad = sql`${workoutSets.plannedWeightKg} * ${workoutSets.plannedReps}`
        // A planned set left unperformed inside a completed session counts as
        // zero executed, not as absent — that gap is exactly what this measures.
        const actualLoad = sql`coalesce(${workoutSets.weightKg}, 0) * coalesce(${workoutSets.reps}, 0)`
        const hasPlan = and(isNotNull(workoutSets.plannedWeightKg), isNotNull(workoutSets.plannedReps))!
        const sumWhere = (expr: SQL, condition: SQL) =>
            sql<number>`coalesce(sum(${expr}) filter (where ${condition}), 0)`

        const setAggregates = this.db
            .select({
                volumeKg: sumWhere(volume, rangeOnly),
                previousVolumeKg: sumWhere(volume, inPrevious),
                successSets: countWhere(ranged(eq(workoutSets.outcome, 'success'))),
                failedSets: countWhere(ranged(eq(workoutSets.outcome, 'failed'))),
                pendingSets: countWhere(
                    ranged(completed, isNull(workoutSets.outcome), isNotNull(workoutSets.weightKg)),
                ),
                plannedLoadKg: sumWhere(plannedLoad, ranged(completed, hasPlan)),
                actualLoadKg: sumWhere(actualLoad, ranged(completed, hasPlan)),
                plannedSets: countWhere(ranged(completed, hasPlan)),
            })
            .from(workoutSets)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .where(and(...widest))

        // No range filter on purpose: "last trained 40 days ago" is precisely the
        // fact a 30-day window would hide, and it's the one a coach needs most.
        const allTimeBounds = this.db
            .select({
                firstSessionAt: sql<Date | null>`min(${workoutSessions.performedAt}) filter (where ${completed})`,
                lastSessionAt: sql<Date | null>`max(${workoutSessions.performedAt}) filter (where ${completed})`,
            })
            .from(workoutSessions)
            .where(eq(workoutSessions.userId, filter.userId))

        const [[sessions], [sets], [bounds]] = await Promise.all([sessionAggregates, setAggregates, allTimeBounds])

        return {
            plannedCompleted: Number(sessions?.plannedCompleted ?? 0),
            plannedMissed: Number(sessions?.plannedMissed ?? 0),
            plannedUpcoming: Number(sessions?.plannedUpcoming ?? 0),
            completedSessions: Number(sessions?.completedSessions ?? 0),
            previousCompletedSessions: Number(sessions?.previousCompletedSessions ?? 0),
            successSets: Number(sets?.successSets ?? 0),
            failedSets: Number(sets?.failedSets ?? 0),
            pendingSets: Number(sets?.pendingSets ?? 0),
            plannedLoadKg: Number(sets?.plannedLoadKg ?? 0),
            actualLoadKg: Number(sets?.actualLoadKg ?? 0),
            plannedSets: Number(sets?.plannedSets ?? 0),
            volumeKg: Number(sets?.volumeKg ?? 0),
            previousVolumeKg: Number(sets?.previousVolumeKg ?? 0),
            firstSessionAt: bounds?.firstSessionAt == null ? null : new Date(bounds.firstSessionAt),
            lastSessionAt: bounds?.lastSessionAt == null ? null : new Date(bounds.lastSessionAt),
        }
    }

    /**
     * `execution()` bucketed by week. Two queries for the same reason as there —
     * missed sessions have no sets to join — merged on the week key, so a week
     * that only has one of the two halves still appears with zeros for the other.
     */
    async executionSeries(filter: ExecutionFilter): Promise<ExecutionBucketRow[]> {
        const bucket = sql<Date>`date_trunc('week', ${workoutSessions.performedAt})`
        const range: SQL[] = []
        if (filter.from) range.push(gte(workoutSessions.performedAt, filter.from))
        if (filter.to) range.push(lte(workoutSessions.performedAt, filter.to))

        const completed = eq(workoutSessions.status, 'completed')

        const adherence = this.db
            .select({
                bucketStart: bucket,
                plannedCompleted: sql<number>`count(*) filter (where ${completed})::int`,
                plannedMissed: sql<number>`count(*) filter (where ${and(
                    eq(workoutSessions.status, 'planned'),
                    lt(workoutSessions.performedAt, filter.now),
                )})::int`,
            })
            .from(workoutSessions)
            .where(
                and(
                    eq(workoutSessions.userId, filter.userId),
                    filter.plannedByUserId ? eq(workoutSessions.plannedByUserId, filter.plannedByUserId) : undefined,
                    ...range,
                ),
            )
            .groupBy(bucket)

        const hasPlan = and(isNotNull(workoutSets.plannedWeightKg), isNotNull(workoutSets.plannedReps))!

        const load = this.db
            .select({
                bucketStart: bucket,
                plannedLoadKg: sql<number>`coalesce(sum(${workoutSets.plannedWeightKg} * ${workoutSets.plannedReps}), 0)`,
                actualLoadKg: sql<number>`coalesce(sum(coalesce(${workoutSets.weightKg}, 0) * coalesce(${workoutSets.reps}, 0)), 0)`,
            })
            .from(workoutSets)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .where(and(eq(workoutSessions.userId, filter.userId), completed, hasPlan, ...range))
            .groupBy(bucket)

        const [adherenceRows, loadRows] = await Promise.all([adherence, load])

        const byWeek = new Map<number, ExecutionBucketRow>()
        const at = (raw: Date): ExecutionBucketRow => {
            const bucketStart = new Date(raw)
            const key = bucketStart.getTime()
            const existing = byWeek.get(key)
            if (existing) return existing

            const fresh = { bucketStart, plannedCompleted: 0, plannedMissed: 0, plannedLoadKg: 0, actualLoadKg: 0 }
            byWeek.set(key, fresh)

            return fresh
        }

        for (const row of adherenceRows) {
            const week = at(row.bucketStart)
            week.plannedCompleted = Number(row.plannedCompleted)
            week.plannedMissed = Number(row.plannedMissed)
        }

        for (const row of loadRows) {
            const week = at(row.bucketStart)
            week.plannedLoadKg = Number(row.plannedLoadKg)
            week.actualLoadKg = Number(row.actualLoadKg)
        }

        return [...byWeek.values()].sort((a, b) => a.bucketStart.getTime() - b.bucketStart.getTime())
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
