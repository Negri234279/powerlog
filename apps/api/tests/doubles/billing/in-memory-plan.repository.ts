import type { PlanAudience } from '../../../src/shared/contracts/entitlements'
import type { PlanAggregate } from '../../../src/modules/billing/domain/entities/plan.entity'
import { PlanRepository } from '../../../src/modules/billing/domain/repositories/plan.repository'

/** In-memory PlanRepository implementing the real port. */
export class InMemoryPlanRepository extends PlanRepository {
    private readonly byId = new Map<string, PlanAggregate>()

    constructor(seed: PlanAggregate[] = []) {
        super()
        for (const plan of seed) this.byId.set(plan.id, plan)
    }

    seed(plan: PlanAggregate): this {
        this.byId.set(plan.id, plan)

        return this
    }

    async findById(id: string): Promise<PlanAggregate | null> {
        return this.byId.get(id) ?? null
    }

    async findActiveFree(audience: PlanAudience): Promise<PlanAggregate | null> {
        for (const plan of this.byId.values()) {
            if (plan.audience === audience && plan.isFree && plan.status === 'active') return plan
        }

        return null
    }
}
