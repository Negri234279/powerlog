import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNotNull, ne, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type ExerciseSessionHistoryFilter,
    ExerciseSessionHistoryReadModel,
    type ExerciseSessionHistoryRow,
    type ExerciseSessionHistorySet,
} from '../../../application/ports/exercise-session-history.read-model'
import type { WorkoutStatus } from '../../../domain/workout-status'
import { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'
import { workoutSessions } from '../schema/workout-sessions.schema'
import { workoutSets } from '../schema/workout-sets.schema'

@Injectable()
export class DrizzleExerciseSessionHistoryReadModel extends ExerciseSessionHistoryReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async forExercise(filter: ExerciseSessionHistoryFilter): Promise<ExerciseSessionHistoryRow[]> {
        const conditions: SQL[] = [
            eq(workoutSessions.userId, filter.userId),
            eq(workoutSessions.status, 'completed'),
            eq(workoutExerciseEntries.exerciseId, filter.exerciseId),
            // Only performed sets — a set needs both weight and reps to be a mark.
            isNotNull(workoutSets.weightKg),
            isNotNull(workoutSets.reps),
        ]
        if (filter.excludeSessionId) conditions.push(ne(workoutSessions.id, filter.excludeSessionId))

        // One row per session, its performed sets folded into an ordered JSON array.
        // The inner joins drop sessions/entries without logged sets, so GROUP BY +
        // LIMIT counts *sessions* directly (no fan-out over sets).
        const sets = sql<ExerciseSessionHistorySet[]>`json_agg(json_build_object(
            'plannedWeightKg', ${workoutSets.plannedWeightKg},
            'plannedReps', ${workoutSets.plannedReps},
            'weightKg', ${workoutSets.weightKg},
            'reps', ${workoutSets.reps},
            'rpe', ${workoutSets.rpe},
            'rir', ${workoutSets.rir},
            'e1rmKg', ${workoutSets.e1rmKg}
        ) order by ${workoutExerciseEntries.order}, ${workoutSets.order})`

        const rows = await this.db
            .select({
                sessionId: workoutSessions.id,
                performedAt: workoutSessions.performedAt,
                status: workoutSessions.status,
                sets,
            })
            .from(workoutSessions)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.sessionId, workoutSessions.id))
            .innerJoin(workoutSets, eq(workoutSets.entryId, workoutExerciseEntries.id))
            .where(and(...conditions))
            .groupBy(workoutSessions.id)
            .orderBy(desc(workoutSessions.performedAt), desc(workoutSessions.id))
            .limit(filter.limit)

        return rows.map((row) => ({
            sessionId: row.sessionId,
            performedAt: row.performedAt,
            status: row.status as WorkoutStatus,
            sets: row.sets.map((set) => ({
                plannedWeightKg: set.plannedWeightKg === null ? null : Number(set.plannedWeightKg),
                plannedReps: set.plannedReps === null ? null : Number(set.plannedReps),
                weightKg: Number(set.weightKg),
                reps: Number(set.reps),
                rpe: set.rpe === null ? null : Number(set.rpe),
                rir: set.rir === null ? null : Number(set.rir),
                e1rmKg: set.e1rmKg === null ? null : Number(set.e1rmKg),
            })),
        }))
    }
}
