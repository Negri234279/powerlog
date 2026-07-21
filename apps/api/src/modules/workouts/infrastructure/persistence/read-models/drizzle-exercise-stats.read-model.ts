import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gte, isNotNull, lte, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { DEFAULT_LOCALE } from '../../../../../shared/i18n/locale'
import {
    type ExerciseStatsFilter,
    ExerciseStatsReadModel,
    type ExerciseStatsRow,
} from '../../../application/ports/exercise-stats.read-model'
import { localizedExerciseName } from './localized-exercise-name'
import { exercises } from '../schema/exercises.schema'
import { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'
import { workoutSessions } from '../schema/workout-sessions.schema'
import { workoutSets } from '../schema/workout-sets.schema'

@Injectable()
export class DrizzleExerciseStatsReadModel extends ExerciseStatsReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async perExercise(filter: ExerciseStatsFilter): Promise<ExerciseStatsRow[]> {
        const conditions: SQL[] = [
            eq(workoutSessions.userId, filter.userId),
            isNotNull(workoutSets.weightKg),
            isNotNull(workoutSets.reps),
        ]
        if (filter.from) conditions.push(gte(workoutSessions.performedAt, filter.from))
        if (filter.to) conditions.push(lte(workoutSessions.performedAt, filter.to))

        const volume = sql<number>`coalesce(sum(${workoutSets.weightKg} * ${workoutSets.reps}), 0)`

        // GROUP BY the exercise PK lets us select its other columns (functional
        // dependency) alongside the aggregates.
        const rows = await this.db
            .select({
                exerciseId: exercises.id,
                slug: exercises.slug,
                name: localizedExerciseName(filter.locale ?? DEFAULT_LOCALE),
                category: exercises.category,
                totalVolumeKg: volume,
                totalSets: sql<number>`count(${workoutSets.id})::int`,
                totalReps: sql<number>`coalesce(sum(${workoutSets.reps}), 0)::int`,
                bestE1rmKg: sql<number | null>`max(${workoutSets.e1rmKg})`,
                heaviestWeightKg: sql<number | null>`max(${workoutSets.weightKg})`,
                successSets: sql<number>`count(*) filter (where ${workoutSets.outcome} = 'success')::int`,
                failedSets: sql<number>`count(*) filter (where ${workoutSets.outcome} = 'failed')::int`,
            })
            .from(workoutSets)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .innerJoin(exercises, eq(exercises.id, workoutExerciseEntries.exerciseId))
            .where(and(...conditions))
            .groupBy(exercises.id)
            .orderBy(desc(volume))

        // float8 comes back as a number, but coerce defensively (counts cast to int).
        return rows.map((row) => ({
            exerciseId: row.exerciseId,
            slug: row.slug,
            name: row.name,
            category: row.category,
            totalVolumeKg: Number(row.totalVolumeKg),
            totalSets: Number(row.totalSets),
            totalReps: Number(row.totalReps),
            bestE1rmKg: row.bestE1rmKg === null ? null : Number(row.bestE1rmKg),
            heaviestWeightKg: row.heaviestWeightKg === null ? null : Number(row.heaviestWeightKg),
            successSets: Number(row.successSets),
            failedSets: Number(row.failedSets),
        }))
    }
}
