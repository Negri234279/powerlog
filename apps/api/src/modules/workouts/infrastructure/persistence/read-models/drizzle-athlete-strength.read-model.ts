import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type AthleteStrengthRow,
    AthleteStrengthReadModel,
} from '../../../application/ports/athlete-strength.read-model'
import { exercises } from '../schema/exercises.schema'
import { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'
import { workoutSessions } from '../schema/workout-sessions.schema'
import { workoutSets } from '../schema/workout-sets.schema'

@Injectable()
export class DrizzleAthleteStrengthReadModel extends AthleteStrengthReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async forUser(userId: string, limit: number): Promise<AthleteStrengthRow[]> {
        // `mapWith` runs the column's own driver mapper over the aggregate: a raw
        // `max()` comes back from pg as a timestamp string, not a Date.
        const lastTrainedAt = sql`max(${workoutSessions.performedAt})`.mapWith(workoutSessions.performedAt)

        // Best e1RM ever, but ordered by recency: a lift the athlete has not
        // touched in a year says less about what they can do next week than one
        // they trained on Tuesday. GROUP BY the exercise PK lets `slug` come along
        // by functional dependency.
        const rows = await this.db
            .select({
                slug: exercises.slug,
                e1rmKg: sql<number>`max(${workoutSets.e1rmKg})`,
                lastTrainedAt,
            })
            .from(workoutSets)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .innerJoin(exercises, eq(exercises.id, workoutExerciseEntries.exerciseId))
            .where(
                and(
                    eq(workoutSessions.userId, userId),
                    eq(workoutSessions.status, 'completed'),
                    isNotNull(workoutSets.e1rmKg),
                ),
            )
            .groupBy(exercises.id)
            .orderBy(desc(lastTrainedAt))
            .limit(limit)

        return rows.map((row) => ({
            slug: row.slug,
            e1rmKg: Number(row.e1rmKg),
            lastTrainedAt: row.lastTrainedAt,
        }))
    }
}
