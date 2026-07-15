import { Inject, Injectable } from '@nestjs/common'
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { MesocycleAggregate } from '../../../domain/entities/mesocycle.entity'
import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { MesocycleMapper } from '../mappers/mesocycle.mapper'
import { mesocycleDayExercises } from '../schema/mesocycle-day-exercises.schema'
import { mesocycleDaySets } from '../schema/mesocycle-day-sets.schema'
import { mesocycleDays } from '../schema/mesocycle-days.schema'
import { mesocycleMicrocycles } from '../schema/mesocycle-microcycles.schema'
import { mesocycles } from '../schema/mesocycles.schema'

@Injectable()
export class DrizzleMesocycleRepository extends MesocycleRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    /** Upserts the whole tree: the mesocycle row is upserted, children replaced. */
    async save(mesocycle: MesocycleAggregate): Promise<void> {
        const { mesocycle: row, microcycles, days, exercises, sets } = MesocycleMapper.toPersistence(mesocycle)
        await this.db.transaction(async (tx) => {
            await tx
                .insert(mesocycles)
                .values(row)
                .onConflictDoUpdate({
                    target: mesocycles.id,
                    set: {
                        name: row.name,
                        notes: row.notes,
                        goal: row.goal,
                        startDate: row.startDate,
                        status: row.status,
                        updatedAt: row.updatedAt,
                    },
                })
            // Replace children (cascade removes days/exercises/sets), then reinsert
            // top-down so every FK target exists first.
            await tx.delete(mesocycleMicrocycles).where(eq(mesocycleMicrocycles.mesocycleId, mesocycle.id))
            if (microcycles.length > 0) await tx.insert(mesocycleMicrocycles).values(microcycles)
            if (days.length > 0) await tx.insert(mesocycleDays).values(days)
            if (exercises.length > 0) await tx.insert(mesocycleDayExercises).values(exercises)
            if (sets.length > 0) await tx.insert(mesocycleDaySets).values(sets)
        })
    }

    async findById(id: string): Promise<MesocycleAggregate | null> {
        const [row] = await this.db.select().from(mesocycles).where(eq(mesocycles.id, id)).limit(1)
        if (!row) return null

        const microcycleRows = await this.db
            .select()
            .from(mesocycleMicrocycles)
            .where(eq(mesocycleMicrocycles.mesocycleId, id))
            .orderBy(asc(mesocycleMicrocycles.weekIndex))

        const microcycleIds = microcycleRows.map((m) => m.id)
        const dayRows =
            microcycleIds.length > 0
                ? await this.db
                      .select()
                      .from(mesocycleDays)
                      .where(inArray(mesocycleDays.microcycleId, microcycleIds))
                      .orderBy(asc(mesocycleDays.order))
                : []

        const dayIds = dayRows.map((d) => d.id)
        const exerciseRows =
            dayIds.length > 0
                ? await this.db
                      .select()
                      .from(mesocycleDayExercises)
                      .where(inArray(mesocycleDayExercises.dayId, dayIds))
                      .orderBy(asc(mesocycleDayExercises.order))
                : []

        const exerciseIds = exerciseRows.map((e) => e.id)
        const setRows =
            exerciseIds.length > 0
                ? await this.db
                      .select()
                      .from(mesocycleDaySets)
                      .where(inArray(mesocycleDaySets.dayExerciseId, exerciseIds))
                      .orderBy(asc(mesocycleDaySets.order))
                : []

        return MesocycleMapper.toDomain(row, microcycleRows, dayRows, exerciseRows, setRows)
    }

    async countSelfCreatedBy(userId: string): Promise<number> {
        const [row] = await this.db
            .select({ value: count() })
            .from(mesocycles)
            .where(and(eq(mesocycles.ownerId, userId), isNull(mesocycles.plannedByUserId)))

        return row?.value ?? 0
    }

    async delete(id: string): Promise<void> {
        await this.db.delete(mesocycles).where(eq(mesocycles.id, id))
    }

    async deleteAllByOwner(ownerId: string): Promise<void> {
        await this.db.delete(mesocycles).where(eq(mesocycles.ownerId, ownerId))
    }
}
