import type { PlanTranslation } from '../../../domain/repositories/plan-translation.repository'

export class UpdatePlanCommand {
    constructor(
        readonly planId: string,
        /** Only the fields present are touched. `description: null` clears it. */
        readonly patch: {
            name?: string
            description?: string | null
            /** Raw jsonb; re-validated against the plan's audience. */
            entitlements?: unknown
            sortOrder?: number
            highlighted?: boolean
            /** Absent leaves the translations alone; present replaces the whole set. */
            translations?: PlanTranslation[]
        },
    ) {}
}
