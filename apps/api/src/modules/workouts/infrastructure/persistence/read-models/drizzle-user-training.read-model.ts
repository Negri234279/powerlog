import { Inject, Injectable } from '@nestjs/common'
import { count, countDistinct, eq, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { UserTrainingSummary } from '../../../../../shared/contracts/user-training'
import { UserTrainingReadModel } from '../../../application/ports/user-training.read-model'
import { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'
import { workoutSessions } from '../schema/workout-sessions.schema'
import { workoutSets } from '../schema/workout-sets.schema'

/**
 * Per-user training figures, all keyed on `workout_sessions.user_id` (the
 * user_status_performed index covers the session aggregates). Sets and distinct
 * exercises reach the user's rows by joining up through their entries.
 */
@Injectable()
export class DrizzleUserTrainingReadModel extends UserTrainingReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async read(userId: string): Promise<UserTrainingSummary> {
        const [sessions] = await this.db
            .select({
                total: count(),
                completed: sql<number>`sum(case when ${workoutSessions.status} = 'completed' then 1 else 0 end)::int`,
                last30: sql<number>`sum(case when ${workoutSessions.performedAt} >= now() - interval '30 days' then 1 else 0 end)::int`,
                // A raw aggregate comes back from the driver as a string, not a Date,
                // so we parse it below rather than trust the compile-time type.
                lastAt: sql<string | null>`max(${workoutSessions.performedAt})`,
            })
            .from(workoutSessions)
            .where(eq(workoutSessions.userId, userId))

        const [entries] = await this.db
            .select({ exercises: countDistinct(workoutExerciseEntries.exerciseId) })
            .from(workoutExerciseEntries)
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .where(eq(workoutSessions.userId, userId))

        const [sets] = await this.db
            .select({ value: count() })
            .from(workoutSets)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .where(eq(workoutSessions.userId, userId))

        return {
            sessions: Number(sessions?.total ?? 0),
            completedSessions: Number(sessions?.completed ?? 0),
            sets: Number(sets?.value ?? 0),
            distinctExercises: Number(entries?.exercises ?? 0),
            lastSessionAt: sessions?.lastAt ? new Date(sessions.lastAt) : null,
            sessionsLast30Days: Number(sessions?.last30 ?? 0),
        }
    }
}
