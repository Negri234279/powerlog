import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, ilike, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type MesocycleListFilter,
    MesocycleListReadModel,
    type MesocycleSummaryRow,
} from '../../../application/ports/mesocycle-list.read-model'
import type { MesocycleStatus } from '../../../domain/mesocycle-status'
import { mesocycleDays } from '../schema/mesocycle-days.schema'
import { mesocycleMicrocycles } from '../schema/mesocycle-microcycles.schema'
import { mesocycles } from '../schema/mesocycles.schema'

@Injectable()
export class DrizzleMesocycleListReadModel extends MesocycleListReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async list(filter: MesocycleListFilter): Promise<MesocycleSummaryRow[]> {
        const conditions: SQL[] = [eq(mesocycles.ownerId, filter.ownerId)]
        if (filter.search) {
            // Escape LIKE wildcards so user text matches literally.
            const escaped = filter.search.replace(/[\\%_]/g, (ch) => `\\${ch}`)
            conditions.push(ilike(mesocycles.name, `%${escaped}%`))
        }

        // LEFT JOINs so empty mesocycles still appear; counts use DISTINCT because
        // the microcycle rows fan out across their days.
        const rows = await this.db
            .select({
                id: mesocycles.id,
                name: mesocycles.name,
                notes: mesocycles.notes,
                goal: mesocycles.goal,
                status: mesocycles.status,
                startDate: mesocycles.startDate,
                updatedAt: mesocycles.updatedAt,
                weekCount: sql<number>`count(distinct ${mesocycleMicrocycles.id})::int`,
                dayCount: sql<number>`count(distinct ${mesocycleDays.id})::int`,
            })
            .from(mesocycles)
            .leftJoin(mesocycleMicrocycles, eq(mesocycleMicrocycles.mesocycleId, mesocycles.id))
            .leftJoin(mesocycleDays, eq(mesocycleDays.microcycleId, mesocycleMicrocycles.id))
            .where(and(...conditions))
            .groupBy(mesocycles.id)
            .orderBy(desc(mesocycles.updatedAt))

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            notes: row.notes,
            goal: row.goal,
            status: row.status as MesocycleStatus,
            startDate: row.startDate,
            updatedAt: row.updatedAt,
            weekCount: Number(row.weekCount),
            dayCount: Number(row.dayCount),
        }))
    }
}
