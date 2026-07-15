import { Inject, Injectable } from '@nestjs/common'
import { asc, count, eq, inArray } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { WorkoutTemplateAggregate } from '../../../domain/entities/workout-template.entity'
import { WorkoutTemplateRepository } from '../../../domain/repositories/workout-template.repository'
import { WorkoutTemplateMapper } from '../mappers/workout-template.mapper'
import { workoutTemplateExercises } from '../schema/workout-template-exercises.schema'
import { workoutTemplateSets } from '../schema/workout-template-sets.schema'
import { workoutTemplates } from '../schema/workout-templates.schema'

@Injectable()
export class DrizzleWorkoutTemplateRepository extends WorkoutTemplateRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    /** Upserts the whole tree: the template row is upserted, children are replaced. */
    async save(template: WorkoutTemplateAggregate): Promise<void> {
        const { template: templateRow, exercises, sets } = WorkoutTemplateMapper.toPersistence(template)
        await this.db.transaction(async (tx) => {
            await tx
                .insert(workoutTemplates)
                .values(templateRow)
                .onConflictDoUpdate({
                    target: workoutTemplates.id,
                    set: {
                        name: templateRow.name,
                        notes: templateRow.notes,
                        updatedAt: templateRow.updatedAt,
                    },
                })
            // Replace children (cascade removes the old sets), then reinsert.
            await tx.delete(workoutTemplateExercises).where(eq(workoutTemplateExercises.templateId, template.id))
            if (exercises.length > 0) await tx.insert(workoutTemplateExercises).values(exercises)
            if (sets.length > 0) await tx.insert(workoutTemplateSets).values(sets)
        })
    }

    async findById(id: string): Promise<WorkoutTemplateAggregate | null> {
        const [templateRow] = await this.db.select().from(workoutTemplates).where(eq(workoutTemplates.id, id)).limit(1)
        if (!templateRow) return null

        const exerciseRows = await this.db
            .select()
            .from(workoutTemplateExercises)
            .where(eq(workoutTemplateExercises.templateId, id))
            .orderBy(asc(workoutTemplateExercises.order))

        const exerciseIds = exerciseRows.map((e) => e.id)
        const setRows =
            exerciseIds.length > 0
                ? await this.db
                      .select()
                      .from(workoutTemplateSets)
                      .where(inArray(workoutTemplateSets.templateExerciseId, exerciseIds))
                      .orderBy(asc(workoutTemplateSets.order))
                : []

        return WorkoutTemplateMapper.toDomain(templateRow, exerciseRows, setRows)
    }

    async countByOwner(ownerId: string): Promise<number> {
        const [row] = await this.db
            .select({ value: count() })
            .from(workoutTemplates)
            .where(eq(workoutTemplates.ownerId, ownerId))

        return row?.value ?? 0
    }

    async delete(id: string): Promise<void> {
        await this.db.delete(workoutTemplates).where(eq(workoutTemplates.id, id))
    }

    async deleteAllByOwner(ownerId: string): Promise<void> {
        await this.db.delete(workoutTemplates).where(eq(workoutTemplates.ownerId, ownerId))
    }
}
