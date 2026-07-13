import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import type { PlanAggregate } from '../entities/plan.entity'

/** Persistence port for the plan catalog. */
export abstract class PlanRepository {
    abstract findById(id: string): Promise<PlanAggregate | null>

    /**
     * The active free plan of an audience — what a user without a live
     * subscription falls back to. At most one exists (partial unique index).
     */
    abstract findActiveFree(audience: PlanAudience): Promise<PlanAggregate | null>
}
