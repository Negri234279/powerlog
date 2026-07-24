import type { PlanAggregate } from '../../../src/modules/billing/domain/entities/plan.entity'
import { PlanRepository } from '../../../src/modules/billing/domain/repositories/plan.repository'
import type { PlanAudience } from '../../../src/shared/contracts/entitlements'

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

    async save(plan: PlanAggregate): Promise<void> {
        this.byId.set(plan.id, plan)
    }

    async findById(id: string): Promise<PlanAggregate | null> {
        return this.byId.get(id) ?? null
    }

    async findBySlug(slug: string): Promise<PlanAggregate | null> {
        return [...this.byId.values()].find((plan) => plan.slug === slug) ?? null
    }

    async findAll(audience?: PlanAudience): Promise<PlanAggregate[]> {
        return [...this.byId.values()]
            .filter((plan) => !audience || plan.audience === audience)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug))
    }

    async findActiveFree(audience: PlanAudience): Promise<PlanAggregate | null> {
        for (const plan of this.byId.values()) {
            if (plan.audience === audience && plan.isFree && plan.status === 'active') return plan
        }

        return null
    }
}
