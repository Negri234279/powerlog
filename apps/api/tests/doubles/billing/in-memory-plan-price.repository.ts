import type { PlanPriceEntity } from '../../../src/modules/billing/domain/entities/plan-price.entity'
import type { Currency, PlanInterval } from '../../../src/modules/billing/domain/plan-interval'
import { PlanPriceRepository } from '../../../src/modules/billing/domain/repositories/plan-price.repository'

/** In-memory PlanPriceRepository implementing the real port. */
export class InMemoryPlanPriceRepository extends PlanPriceRepository {
    private readonly byId = new Map<string, PlanPriceEntity>()

    constructor(seed: PlanPriceEntity[] = []) {
        super()
        for (const price of seed) this.byId.set(price.id, price)
    }

    async save(price: PlanPriceEntity): Promise<void> {
        this.byId.set(price.id, price)
    }

    async findById(id: string): Promise<PlanPriceEntity | null> {
        return this.byId.get(id) ?? null
    }

    async findByPlans(planIds: string[]): Promise<PlanPriceEntity[]> {
        return [...this.byId.values()].filter((price) => planIds.includes(price.planId))
    }

    async findActive(planId: string, interval: PlanInterval, currency: Currency): Promise<PlanPriceEntity | null> {
        return (
            [...this.byId.values()].find(
                (price) =>
                    price.planId === planId &&
                    price.interval === interval &&
                    price.currency === currency &&
                    price.active,
            ) ?? null
        )
    }

    all(): PlanPriceEntity[] {
        return [...this.byId.values()]
    }
}
