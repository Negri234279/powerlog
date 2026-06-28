import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, exists, gte, ilike, lte, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type WorkoutHistoryFilter,
    type WorkoutHistorySlice,
    WorkoutHistoryReadModel,
} from '../../../application/ports/workout-history.read-model'
import { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'
import { workoutSessions } from '../schema/workout-sessions.schema'
import { workoutSets } from '../schema/workout-sets.schema'

@Injectable()
export class DrizzleWorkoutHistoryReadModel extends WorkoutHistoryReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async list(filter: WorkoutHistoryFilter): Promise<WorkoutHistorySlice> {
        const conditions: SQL[] = [eq(workoutSessions.userId, filter.userId)]
        if (filter.status) conditions.push(eq(workoutSessions.status, filter.status))
        if (filter.from) conditions.push(gte(workoutSessions.performedAt, filter.from))
        if (filter.to) conditions.push(lte(workoutSessions.performedAt, filter.to))
        if (filter.exerciseId) {
            // Correlated EXISTS so the entry/set LEFT JOINs (and their counts)
            // stay intact — we only constrain *which sessions* qualify.
            conditions.push(
                exists(
                    this.db
                        .select({ one: sql`1` })
                        .from(workoutExerciseEntries)
                        .where(
                            and(
                                eq(workoutExerciseEntries.sessionId, workoutSessions.id),
                                eq(workoutExerciseEntries.exerciseId, filter.exerciseId),
                            ),
                        ),
                ),
            )
        }
        if (filter.query) {
            // Escape LIKE wildcards so user text matches literally.
            const escaped = filter.query.replace(/[\\%_]/g, (ch) => `\\${ch}`)
            conditions.push(ilike(workoutSessions.notes, `%${escaped}%`))
        }
        if (filter.cursor) {
            // Keyset: rows strictly "after" the cursor under (performedAt, id) DESC.
            conditions.push(
                sql`(${workoutSessions.performedAt}, ${workoutSessions.id}) < (${filter.cursor.performedAt.toISOString()}::timestamptz, ${filter.cursor.id}::uuid)`,
            )
        }

        // Σ weight·reps over logged sets only; planned-only sets contribute 0.
        const volume = sql<number>`coalesce(sum(case
            when ${workoutSets.weightKg} is not null and ${workoutSets.reps} is not null
            then ${workoutSets.weightKg} * ${workoutSets.reps} else 0 end), 0)`

        // LEFT JOINs so sessions with no entries/sets still appear; counts use
        // DISTINCT because the entry rows fan out across their sets.
        const rows = await this.db
            .select({
                id: workoutSessions.id,
                userId: workoutSessions.userId,
                status: workoutSessions.status,
                performedAt: workoutSessions.performedAt,
                notes: workoutSessions.notes,
                plannedByUserId: workoutSessions.plannedByUserId,
                createdAt: workoutSessions.createdAt,
                updatedAt: workoutSessions.updatedAt,
                exerciseCount: sql<number>`count(distinct ${workoutExerciseEntries.id})::int`,
                setCount: sql<number>`count(distinct ${workoutSets.id})::int`,
                totalVolumeKg: volume,
            })
            .from(workoutSessions)
            .leftJoin(workoutExerciseEntries, eq(workoutExerciseEntries.sessionId, workoutSessions.id))
            .leftJoin(workoutSets, eq(workoutSets.entryId, workoutExerciseEntries.id))
            .where(and(...conditions))
            .groupBy(workoutSessions.id)
            .orderBy(desc(workoutSessions.performedAt), desc(workoutSessions.id))
            .limit(filter.limit + 1)

        const hasNextPage = rows.length > filter.limit
        const page = hasNextPage ? rows.slice(0, filter.limit) : rows

        return {
            hasNextPage,
            items: page.map((row) => ({
                id: row.id,
                userId: row.userId,
                status: row.status,
                performedAt: row.performedAt,
                notes: row.notes,
                plannedByUserId: row.plannedByUserId,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                exerciseCount: Number(row.exerciseCount),
                setCount: Number(row.setCount),
                totalVolumeKg: Number(row.totalVolumeKg),
            })),
        }
    }
}
