import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gte, inArray, lt, lte, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type CoachRosterFilter,
    CoachRosterReadModel,
    type CoachRosterRow,
} from '../../../application/ports/coach-roster.read-model'
import { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'
import { workoutSessions } from '../schema/workout-sessions.schema'
import { workoutSets } from '../schema/workout-sets.schema'

@Injectable()
export class DrizzleCoachRosterReadModel extends CoachRosterReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    /**
     * Two grouped queries for the whole squad — never one per athlete.
     *
     * The split is the same one `execution()` needs and for the same reason: a
     * session that was planned and never touched has no qualifying sets, so the
     * set-joined half structurally cannot see it, and adherence is exactly the
     * count of those. Both are `GROUP BY user_id`, so a roster of 40 costs the
     * same two round trips as a roster of 1.
     */
    async roster(filter: CoachRosterFilter): Promise<CoachRosterRow[]> {
        // No athletes ⇒ no query. `inArray` with an empty list is a SQL error in
        // some dialects and a full scan waiting to happen in others.
        if (filter.athleteIds.length === 0) return []

        const { from, to, now } = filter
        const ofRoster = inArray(workoutSessions.userId, filter.athleteIds)

        const inRange: SQL[] = []
        if (from) inRange.push(gte(workoutSessions.performedAt, from))
        if (to) inRange.push(lte(workoutSessions.performedAt, to))
        const rangeOnly: SQL = inRange.length > 0 ? and(...inRange)! : sql`true`

        // The preceding window of equal length, for the volume trend. Unbounded
        // range ⇒ nothing before it ⇒ a predicate that matches nothing.
        const previousFrom = from ? new Date(from.getTime() - ((to ?? now).getTime() - from.getTime())) : undefined
        const inPrevious: SQL = previousFrom
            ? and(gte(workoutSessions.performedAt, previousFrom), lt(workoutSessions.performedAt, from!))!
            : sql`false`

        const completed = eq(workoutSessions.status, 'completed')
        const planned = eq(workoutSessions.status, 'planned')
        const mine = eq(workoutSessions.plannedByUserId, filter.coachId)
        const countWhere = (...parts: SQL[]) => sql<number>`count(*) filter (where ${and(...parts)})::int`

        const sessionRollups = this.db
            .select({
                athleteId: workoutSessions.userId,
                plannedCompleted: countWhere(and(completed, mine, rangeOnly)!),
                plannedMissed: countWhere(and(planned, mine, lt(workoutSessions.performedAt, now), rangeOnly)!),
                completedSessions: countWhere(and(completed, rangeOnly)!),
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
            .where(ofRoster)
            .groupBy(workoutSessions.userId)

        const volume = sql`${workoutSets.weightKg} * ${workoutSets.reps}`

        const volumeRollups = this.db
            .select({
                athleteId: workoutSessions.userId,
                volumeKg: sql<number>`coalesce(sum(${volume}) filter (where ${rangeOnly}), 0)`,
                previousVolumeKg: sql<number>`coalesce(sum(${volume}) filter (where ${inPrevious}), 0)`,
            })
            .from(workoutSets)
            .innerJoin(workoutExerciseEntries, eq(workoutExerciseEntries.id, workoutSets.entryId))
            .innerJoin(workoutSessions, eq(workoutSessions.id, workoutExerciseEntries.sessionId))
            .where(and(ofRoster, previousFrom ? gte(workoutSessions.performedAt, previousFrom) : undefined))
            .groupBy(workoutSessions.userId)

        const [sessions, volumes] = await Promise.all([sessionRollups, volumeRollups])

        const byAthlete = new Map(volumes.map((row) => [row.athleteId, row]))

        // Driven by the requested ids, not by the query results: an athlete who
        // has never logged anything produces no rows at all, and dropping them
        // would silently remove the newest athletes from their coach's roster.
        return filter.athleteIds.map((athleteId) => {
            const session = sessions.find((row) => row.athleteId === athleteId)
            const volumeRow = byAthlete.get(athleteId)

            return {
                athleteId,
                lastSessionAt: session?.lastSessionAt == null ? null : new Date(session.lastSessionAt),
                nextSessionAt: session?.nextSessionAt == null ? null : new Date(session.nextSessionAt),
                plannedCompleted: Number(session?.plannedCompleted ?? 0),
                plannedMissed: Number(session?.plannedMissed ?? 0),
                completedSessions: Number(session?.completedSessions ?? 0),
                volumeKg: Number(volumeRow?.volumeKg ?? 0),
                previousVolumeKg: Number(volumeRow?.previousVolumeKg ?? 0),
            }
        })
    }
}
