import { Inject, Injectable } from '@nestjs/common'
import { eq, inArray } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { SupportedLocale } from '../../../../../shared/i18n/locale'
import {
    type PlanTranslation,
    type PlanTranslationRow,
    PlanTranslationRepository,
} from '../../../domain/repositories/plan-translation.repository'
import { planTranslations } from '../schema/plan-translations.schema'

@Injectable()
export class DrizzlePlanTranslationRepository extends PlanTranslationRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    /** Delete-then-insert in a transaction so a plan's set is exactly what's passed. */
    async replace(planId: string, translations: PlanTranslation[]): Promise<void> {
        await this.db.transaction(async (tx) => {
            await tx.delete(planTranslations).where(eq(planTranslations.planId, planId))
            if (translations.length === 0) return

            await tx.insert(planTranslations).values(
                translations.map((translation) => ({
                    planId,
                    locale: translation.locale,
                    name: translation.name,
                    description: translation.description,
                })),
            )
        })
    }

    async findByPlans(planIds: string[]): Promise<PlanTranslationRow[]> {
        if (planIds.length === 0) return []

        const rows = await this.db.select().from(planTranslations).where(inArray(planTranslations.planId, planIds))

        return rows.map((row) => ({
            planId: row.planId,
            locale: row.locale as SupportedLocale,
            name: row.name,
            description: row.description,
        }))
    }
}
