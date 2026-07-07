import type { SupportedLocale } from '../../../../shared/i18n/locale'
import type { ExerciseEntity } from '../entities/exercise.entity'
import type { ExerciseCategory, ExerciseEquipment, ExerciseMuscle } from '../exercise-taxonomy'

/** Filter for catalog listing. All fields optional; arrays mean "any of". */
export interface ExerciseFilter {
    categories?: ExerciseCategory[]
    equipment?: ExerciseEquipment[]
    muscles?: ExerciseMuscle[]
    /** Free-text match on name or slug (case-insensitive). */
    search?: string
}

/** Offset pagination for catalog listings. */
export interface ExercisePagination {
    limit: number
    offset: number
}

/**
 * Repository for the exercise catalog. Reads serve the athlete-facing picker and
 * the admin panel; the write side is admin-only (enforced in presentation). The
 * Drizzle implementation lives in infrastructure.
 */
export abstract class ExerciseRepository {
    /** Exercises matching the filter, ordered for display (category, then name).
     *  Optional offset pagination; omit it to return the whole match set. `locale`
     *  localizes the display name (English fallback) for the athlete catalog; omit
     *  it (defaults to English) for admin/canonical reads. */
    abstract findAll(
        filter?: ExerciseFilter,
        pagination?: ExercisePagination,
        locale?: SupportedLocale,
    ): Promise<ExerciseEntity[]>
    /** Total exercises matching the filter (for paginated listings). */
    abstract count(filter?: ExerciseFilter): Promise<number>
    abstract findById(id: string): Promise<ExerciseEntity | null>
    abstract findBySlug(slug: string): Promise<ExerciseEntity | null>
    abstract insert(exercise: ExerciseEntity): Promise<void>
    abstract update(exercise: ExerciseEntity): Promise<void>
    abstract delete(id: string): Promise<void>
    /** How many workout entries reference this exercise (0 → safe to delete). */
    abstract countReferences(exerciseId: string): Promise<number>
    /** Upsert a localized display name for an exercise (admin catalog editing). */
    abstract upsertTranslation(exerciseId: string, locale: SupportedLocale, name: string): Promise<void>
    /** Remove a localized display name (reverting that locale to the English fallback). */
    abstract deleteTranslation(exerciseId: string, locale: SupportedLocale): Promise<void>
    /** Localized names for the given exercises, keyed by exercise id (missing = no translation). */
    abstract translationsFor(exerciseIds: string[], locale: SupportedLocale): Promise<Map<string, string>>
}
