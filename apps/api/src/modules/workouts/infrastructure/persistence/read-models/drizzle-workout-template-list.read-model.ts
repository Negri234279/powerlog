import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, ilike, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type WorkoutTemplateListFilter,
    type WorkoutTemplateSummaryRow,
    WorkoutTemplateListReadModel,
} from '../../../application/ports/workout-template-list.read-model'
import { workoutTemplateExercises } from '../schema/workout-template-exercises.schema'
import { workoutTemplateSets } from '../schema/workout-template-sets.schema'
import { workoutTemplates } from '../schema/workout-templates.schema'

@Injectable()
export class DrizzleWorkoutTemplateListReadModel extends WorkoutTemplateListReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async list(filter: WorkoutTemplateListFilter): Promise<WorkoutTemplateSummaryRow[]> {
        const conditions: SQL[] = [eq(workoutTemplates.ownerId, filter.ownerId)]
        if (filter.search) {
            // Escape LIKE wildcards so user text matches literally.
            const escaped = filter.search.replace(/[\\%_]/g, (ch) => `\\${ch}`)
            conditions.push(ilike(workoutTemplates.name, `%${escaped}%`))
        }
        if (filter.scope) conditions.push(eq(workoutTemplates.scope, filter.scope))

        // LEFT JOINs so empty templates still appear; counts use DISTINCT because
        // the exercise rows fan out across their sets.
        const rows = await this.db
            .select({
                id: workoutTemplates.id,
                name: workoutTemplates.name,
                scope: workoutTemplates.scope,
                notes: workoutTemplates.notes,
                updatedAt: workoutTemplates.updatedAt,
                exerciseCount: sql<number>`count(distinct ${workoutTemplateExercises.id})::int`,
                setCount: sql<number>`count(distinct ${workoutTemplateSets.id})::int`,
            })
            .from(workoutTemplates)
            .leftJoin(workoutTemplateExercises, eq(workoutTemplateExercises.templateId, workoutTemplates.id))
            .leftJoin(workoutTemplateSets, eq(workoutTemplateSets.templateExerciseId, workoutTemplateExercises.id))
            .where(and(...conditions))
            .groupBy(workoutTemplates.id)
            .orderBy(asc(workoutTemplates.name))

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            scope: row.scope,
            notes: row.notes,
            updatedAt: row.updatedAt,
            exerciseCount: Number(row.exerciseCount),
            setCount: Number(row.setCount),
        }))
    }
}
