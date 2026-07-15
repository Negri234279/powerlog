import type { PlanAudience } from '../../../../../shared/contracts/entitlements'
import type { PlanStatus } from '../../../domain/entities/plan.entity'
import type { PlanTranslation } from '../../../domain/repositories/plan-translation.repository'

export class CreatePlanCommand {
    constructor(
        readonly audience: PlanAudience,
        readonly slug: string,
        readonly name: string,
        readonly description: string | null,
        /** Raw jsonb; validated against the audience's zod schema by the aggregate. */
        readonly entitlements: unknown,
        readonly status: PlanStatus,
        readonly isFree: boolean,
        readonly sortOrder: number,
        /** Localized name/description for non-default locales. Base name/description
         *  above are the default-locale (English) fallback. */
        readonly translations: PlanTranslation[],
    ) {}
}
