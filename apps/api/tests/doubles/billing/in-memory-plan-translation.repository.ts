import {
    type PlanTranslation,
    type PlanTranslationRow,
    PlanTranslationRepository,
} from '../../../src/modules/billing/domain/repositories/plan-translation.repository'

/** In-memory PlanTranslationRepository keyed by plan id; `replace` overwrites the set. */
export class InMemoryPlanTranslationRepository extends PlanTranslationRepository {
    private readonly store = new Map<string, PlanTranslation[]>()

    constructor(seed: PlanTranslationRow[] = []) {
        super()
        for (const row of seed) {
            const list = this.store.get(row.planId) ?? []
            list.push({ locale: row.locale, name: row.name, description: row.description })
            this.store.set(row.planId, list)
        }
    }

    async replace(planId: string, translations: PlanTranslation[]): Promise<void> {
        this.store.set(
            planId,
            translations.map((translation) => ({ ...translation })),
        )
    }

    async findByPlans(planIds: string[]): Promise<PlanTranslationRow[]> {
        const rows: PlanTranslationRow[] = []
        for (const planId of planIds) {
            for (const translation of this.store.get(planId) ?? []) rows.push({ planId, ...translation })
        }

        return rows
    }
}
