import { Inject, Injectable } from '@nestjs/common'
import { and, asc, count, eq, ilike, inArray, or, type SQL } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { DEFAULT_LOCALE, type SupportedLocale } from '../../../../../shared/i18n/locale'
import type { ExerciseEntity } from '../../../domain/entities/exercise.entity'
import {
    ExerciseRepository,
    type ExerciseFilter,
    type ExercisePagination,
} from '../../../domain/repositories/exercise.repository'
import { ExerciseMapper } from '../mappers/exercise.mapper'
import { localizedExerciseName } from '../read-models/localized-exercise-name'
import { exerciseTranslations } from '../schema/exercise-translations.schema'
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

    async findAll(
        filter?: ExerciseFilter,
        pagination?: ExercisePagination,
        locale: SupportedLocale = DEFAULT_LOCALE,
    ): Promise<ExerciseEntity[]> {
        // The display name is localized (English fallback) and drives the ordering,
        // so a Spanish catalog is alphabetized in Spanish. Every other column is
        // canonical, so the mapped entity is a faithful read projection.
        const name = localizedExerciseName(locale)
        const base = this.db
            .select({
                id: exercises.id,
                slug: exercises.slug,
                name,
                category: exercises.category,
                equipment: exercises.equipment,
                primaryMuscle: exercises.primaryMuscle,
            })
            .from(exercises)
            .where(this.buildWhere(filter))
            .orderBy(asc(exercises.category), asc(name))

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

    async upsertTranslation(exerciseId: string, locale: SupportedLocale, name: string): Promise<void> {
        await this.db
            .insert(exerciseTranslations)
            .values({ exerciseId, locale, name })
            .onConflictDoUpdate({
                target: [exerciseTranslations.exerciseId, exerciseTranslations.locale],
                set: { name },
            })
    }

    async deleteTranslation(exerciseId: string, locale: SupportedLocale): Promise<void> {
        await this.db
            .delete(exerciseTranslations)
            .where(and(eq(exerciseTranslations.exerciseId, exerciseId), eq(exerciseTranslations.locale, locale)))
    }

    async translationsFor(exerciseIds: string[], locale: SupportedLocale): Promise<Map<string, string>> {
        if (exerciseIds.length === 0) return new Map()

        const rows = await this.db
            .select({ exerciseId: exerciseTranslations.exerciseId, name: exerciseTranslations.name })
            .from(exerciseTranslations)
            .where(and(inArray(exerciseTranslations.exerciseId, exerciseIds), eq(exerciseTranslations.locale, locale)))

        return new Map(rows.map((row) => [row.exerciseId, row.name]))
    }
}
