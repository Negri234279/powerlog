import type { SupportedLocale } from '../../../../shared/i18n/locale'

/** A plan's name/description in one non-default locale. */
export interface PlanTranslation {
    locale: SupportedLocale
    name: string
    description: string | null
}

/** Same, tagged with its plan — for batch reads over several plans. */
export interface PlanTranslationRow extends PlanTranslation {
    planId: string
}

/**
 * The localized name/description of plans, alongside the base (default-locale)
 * values on the `plans` row. Kept out of the aggregate — it has no invariants, and
 * the reads that need it (the admin form, the public catalog) resolve it here.
 */
export abstract class PlanTranslationRepository {
    /** Replace a plan's whole translation set (idempotent overwrite). */
    abstract replace(planId: string, translations: PlanTranslation[]): Promise<void>

    /** Every translation of the given plans, for grouping by plan id. */
    abstract findByPlans(planIds: string[]): Promise<PlanTranslationRow[]>
}
