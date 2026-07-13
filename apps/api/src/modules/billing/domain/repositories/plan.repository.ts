import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import type { PlanAggregate } from '../entities/plan.entity'

/** Persistence port for the plan catalog. */
export abstract class PlanRepository {
    abstract save(plan: PlanAggregate): Promise<void>

    abstract findById(id: string): Promise<PlanAggregate | null>

    abstract findBySlug(slug: string): Promise<PlanAggregate | null>

    /** The whole catalog (any status), newest audience order first, for admins. */
    abstract findAll(audience?: PlanAudience): Promise<PlanAggregate[]>

    /**
     * The active free plan of an audience — what a user without a live
     * subscription falls back to. At most one exists (partial unique index).
     */
    abstract findActiveFree(audience: PlanAudience): Promise<PlanAggregate | null>
}
