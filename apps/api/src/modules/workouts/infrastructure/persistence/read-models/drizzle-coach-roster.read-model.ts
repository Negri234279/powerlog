import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gte, inArray, lt, lte, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type CoachRosterFilter,
    CoachRosterReadModel,
    type CoachRosterRow,
} from '../../../application/ports/coach-roster.read-model'
import { workoutSessions } from '../schema/workout-sessions.schema'

@Injectable()
export class DrizzleCoachRosterReadModel extends CoachRosterReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    /**
     * One grouped query over `workout_sessions` for the whole squad — never one
     * per athlete, and never a join to `workout_sets`.
     *
     * That second restriction is what keeps this screen cheap forever: a roster
     * of 40 athletes with five years of training each would otherwise drag every
     * set they have ever logged through a sum, on a page that only ever shows
     * counts and dates. Set-level figures live on the athlete detail page, where
     * they are asked for one athlete at a time.
     */
    async roster(filter: CoachRosterFilter): Promise<CoachRosterRow[]> {
        // No athletes ⇒ no query. `inArray` with an empty list is a SQL error in
        // some dialects and a full scan waiting to happen in others.
        if (filter.athleteIds.length === 0) return []

        const { from, to, now } = filter

        const inRange: SQL[] = []
        if (from) inRange.push(gte(workoutSessions.performedAt, from))
        if (to) inRange.push(lte(workoutSessions.performedAt, to))
        const rangeOnly: SQL = inRange.length > 0 ? and(...inRange)! : sql`true`

        const completed = eq(workoutSessions.status, 'completed')
        const planned = eq(workoutSessions.status, 'planned')
        const mine = eq(workoutSessions.plannedByUserId, filter.coachId)
        const countWhere = (...parts: SQL[]) => sql<number>`count(*) filter (where ${and(...parts)})::int`

        const rows = await this.db
            .select({
                athleteId: workoutSessions.userId,
                plannedCompleted: countWhere(and(completed, mine, rangeOnly)!),
                plannedMissed: countWhere(and(planned, mine, lt(workoutSessions.performedAt, now), rangeOnly)!),
                // Unranged on purpose — see CoachRosterRow.
                lastSessionAt: sql<Date | null>`max(${workoutSessions.performedAt}) filter (where ${completed})`,
                nextSessionAt: sql<Date | null>`min(${workoutSessions.performedAt}) filter (where ${and(
                    planned,
                    gte(workoutSessions.performedAt, now),
                )})`,
            })
            .from(workoutSessions)
            // Scoped to the roster and nothing else: a `to` here would scan away
            // the future sessions `nextSessionAt` exists to find.
            .where(inArray(workoutSessions.userId, filter.athleteIds))
            .groupBy(workoutSessions.userId)

        const byAthlete = new Map(rows.map((row) => [row.athleteId, row]))

        // Driven by the requested ids, not by the query results: an athlete who
        // has never logged anything produces no row at all, and dropping them
        // would silently remove the newest athletes from their coach's roster.
        return filter.athleteIds.map((athleteId) => {
            const row = byAthlete.get(athleteId)

            return {
                athleteId,
                lastSessionAt: row?.lastSessionAt == null ? null : new Date(row.lastSessionAt),
                nextSessionAt: row?.nextSessionAt == null ? null : new Date(row.nextSessionAt),
                plannedCompleted: Number(row?.plannedCompleted ?? 0),
                plannedMissed: Number(row?.plannedMissed ?? 0),
            }
        })
    }
}
