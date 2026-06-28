import { Inject, Injectable } from '@nestjs/common'
import { count, countDistinct, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type AdminWorkoutStats,
    AdminWorkoutStatsReadModel,
} from '../../../application/ports/admin-workout-stats.read-model'
import { exercises } from '../schema/exercises.schema'
import { workoutSessions } from '../schema/workout-sessions.schema'
import { workoutSets } from '../schema/workout-sets.schema'

@Injectable()
export class DrizzleAdminWorkoutStatsReadModel extends AdminWorkoutStatsReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async read(): Promise<AdminWorkoutStats> {
        const [sessions] = await this.db
            .select({
                total: count(),
                completed: sql<number>`sum(case when ${workoutSessions.status} = 'completed' then 1 else 0 end)::int`,
                last7: sql<number>`sum(case when ${workoutSessions.performedAt} >= now() - interval '7 days' then 1 else 0 end)::int`,
                activeUsers: countDistinct(workoutSessions.userId),
            })
            .from(workoutSessions)

        const [sets] = await this.db.select({ value: count() }).from(workoutSets)
        const [catalog] = await this.db.select({ value: count() }).from(exercises)

        return {
            sessions: Number(sessions?.total ?? 0),
            completedSessions: Number(sessions?.completed ?? 0),
            sets: Number(sets?.value ?? 0),
            exercises: Number(catalog?.value ?? 0),
            sessionsLast7Days: Number(sessions?.last7 ?? 0),
            activeUsers: Number(sessions?.activeUsers ?? 0),
        }
    }
}
