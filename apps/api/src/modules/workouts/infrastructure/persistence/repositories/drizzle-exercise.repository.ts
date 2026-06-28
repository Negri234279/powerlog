import { Inject, Injectable } from '@nestjs/common'
import { and, asc, count, eq, ilike, inArray, or, type SQL } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { ExerciseEntity } from '../../../domain/entities/exercise.entity'
import {
    ExerciseRepository,
    type ExerciseFilter,
    type ExercisePagination,
} from '../../../domain/repositories/exercise.repository'
import { ExerciseMapper } from '../mappers/exercise.mapper'
import { exercises } from '../schema/exercises.schema'
import { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'

@Injectable()
export class DrizzleExerciseRepository extends ExerciseRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    private buildWhere(filter?: ExerciseFilter): SQL | undefined {
        const conditions: SQL[] = []
        if (filter?.categories?.length) {
            conditions.push(inArray(exercises.category, filter.categories))
        }
        if (filter?.equipment?.length) {
            conditions.push(inArray(exercises.equipment, filter.equipment))
        }
        if (filter?.muscles?.length) {
            conditions.push(inArray(exercises.primaryMuscle, filter.muscles))
        }
        if (filter?.search) {
            const term = `%${filter.search}%`
            conditions.push(or(ilike(exercises.name, term), ilike(exercises.slug, term)) as SQL)
        }

        return conditions.length ? and(...conditions) : undefined
    }

    async findAll(filter?: ExerciseFilter, pagination?: ExercisePagination): Promise<ExerciseEntity[]> {
        const base = this.db
            .select()
            .from(exercises)
            .where(this.buildWhere(filter))
            .orderBy(asc(exercises.category), asc(exercises.name))

        const rows = await (pagination ? base.limit(pagination.limit).offset(pagination.offset) : base)
        return rows.map(ExerciseMapper.toDomain)
    }

    async count(filter?: ExerciseFilter): Promise<number> {
        const [row] = await this.db.select({ value: count() }).from(exercises).where(this.buildWhere(filter))
        return row?.value ?? 0
    }

    async findById(id: string): Promise<ExerciseEntity | null> {
        const [row] = await this.db.select().from(exercises).where(eq(exercises.id, id)).limit(1)
        return row ? ExerciseMapper.toDomain(row) : null
    }

    async findBySlug(slug: string): Promise<ExerciseEntity | null> {
        const [row] = await this.db.select().from(exercises).where(eq(exercises.slug, slug)).limit(1)
        return row ? ExerciseMapper.toDomain(row) : null
    }

    async insert(exercise: ExerciseEntity): Promise<void> {
        await this.db.insert(exercises).values(ExerciseMapper.toRow(exercise))
    }

    async update(exercise: ExerciseEntity): Promise<void> {
        // slug is immutable, so only the editable fields are written.
        await this.db
            .update(exercises)
            .set({
                name: exercise.name,
                category: exercise.category,
                equipment: exercise.equipment,
                primaryMuscle: exercise.primaryMuscle,
            })
            .where(eq(exercises.id, exercise.id))
    }

    async delete(id: string): Promise<void> {
        await this.db.delete(exercises).where(eq(exercises.id, id))
    }

    async countReferences(exerciseId: string): Promise<number> {
        const [row] = await this.db
            .select({ value: count() })
            .from(workoutExerciseEntries)
            .where(eq(workoutExerciseEntries.exerciseId, exerciseId))
        return row?.value ?? 0
    }
}
