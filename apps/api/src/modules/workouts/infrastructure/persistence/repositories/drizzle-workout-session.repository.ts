import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { WorkoutSessionMapper } from '../mappers/workout-session.mapper'
import { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'
import { workoutSessions } from '../schema/workout-sessions.schema'
import { workoutSets } from '../schema/workout-sets.schema'

@Injectable()
export class DrizzleWorkoutSessionRepository extends WorkoutSessionRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    /** Upserts the whole tree: the session row is upserted, children are replaced. */
    async save(session: WorkoutSessionAggregate): Promise<void> {
        const { session: sessionRow, entries, sets } = WorkoutSessionMapper.toPersistence(session)
        await this.db.transaction(async (tx) => {
            await tx
                .insert(workoutSessions)
                .values(sessionRow)
                .onConflictDoUpdate({
                    target: workoutSessions.id,
                    set: {
                        status: sessionRow.status,
                        performedAt: sessionRow.performedAt,
                        notes: sessionRow.notes,
                        plannedByUserId: sessionRow.plannedByUserId,
                        updatedAt: sessionRow.updatedAt,
                    },
                })
            // Replace children (cascade removes the old sets), then reinsert.
            await tx.delete(workoutExerciseEntries).where(eq(workoutExerciseEntries.sessionId, session.id))
            if (entries.length > 0) await tx.insert(workoutExerciseEntries).values(entries)
            if (sets.length > 0) await tx.insert(workoutSets).values(sets)
        })
    }

    async findById(id: string): Promise<WorkoutSessionAggregate | null> {
        const [sessionRow] = await this.db.select().from(workoutSessions).where(eq(workoutSessions.id, id)).limit(1)
        if (!sessionRow) return null

        const entryRows = await this.db
            .select()
            .from(workoutExerciseEntries)
            .where(eq(workoutExerciseEntries.sessionId, id))
            .orderBy(asc(workoutExerciseEntries.order))

        const entryIds = entryRows.map((e) => e.id)
        const setRows =
            entryIds.length > 0
                ? await this.db
                      .select()
                      .from(workoutSets)
                      .where(inArray(workoutSets.entryId, entryIds))
                      .orderBy(asc(workoutSets.order))
                : []

        return WorkoutSessionMapper.toDomain(sessionRow, entryRows, setRows)
    }

    async delete(id: string): Promise<void> {
        await this.db.delete(workoutSessions).where(eq(workoutSessions.id, id))
    }

    async deleteAllByUser(userId: string): Promise<void> {
        await this.db.delete(workoutSessions).where(eq(workoutSessions.userId, userId))
    }

    async generatedWeeks(mesocycleId: string): Promise<number[]> {
        const rows = await this.db
            .selectDistinct({ week: workoutSessions.mesocycleWeek })
            .from(workoutSessions)
            .where(and(eq(workoutSessions.mesocycleId, mesocycleId), isNotNull(workoutSessions.mesocycleWeek)))
            .orderBy(asc(workoutSessions.mesocycleWeek))

        return rows.map((row) => row.week).filter((week): week is number => week !== null)
    }

    async deletePlannedByMesocycleWeek(mesocycleId: string, week: number): Promise<void> {
        await this.db
            .delete(workoutSessions)
            .where(
                and(
                    eq(workoutSessions.mesocycleId, mesocycleId),
                    eq(workoutSessions.mesocycleWeek, week),
                    eq(workoutSessions.status, 'planned'),
                ),
            )
    }
}
