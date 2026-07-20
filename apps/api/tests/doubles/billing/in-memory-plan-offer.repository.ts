import type { PlanOfferEntity } from '../../../src/modules/billing/domain/entities/plan-offer.entity'
import { PlanOfferRepository } from '../../../src/modules/billing/domain/repositories/plan-offer.repository'

/** In-memory PlanOfferRepository implementing the real port. */
export class InMemoryPlanOfferRepository extends PlanOfferRepository {
    private readonly byId = new Map<string, PlanOfferEntity>()

    constructor(seed: PlanOfferEntity[] = []) {
        super()
        for (const offer of seed) this.byId.set(offer.id, offer)
    }

    async save(offer: PlanOfferEntity): Promise<void> {
        this.byId.set(offer.id, offer)
    }

    async findById(id: string): Promise<PlanOfferEntity | null> {
        return this.byId.get(id) ?? null
    }

    async findActiveByPlan(planId: string): Promise<PlanOfferEntity | null> {
        return [...this.byId.values()].find((offer) => offer.planId === planId && offer.active) ?? null
    }

    async findActiveByPlans(planIds: string[]): Promise<PlanOfferEntity[]> {
        return [...this.byId.values()].filter((offer) => planIds.includes(offer.planId) && offer.active)
    }

    async findByPlans(planIds: string[]): Promise<PlanOfferEntity[]> {
        return [...this.byId.values()].filter((offer) => planIds.includes(offer.planId))
    }

    async findPriceIdByPaypalPlanId(paypalPlanId: string): Promise<string | null> {
        for (const offer of this.byId.values()) {
            for (const [priceId, planId] of Object.entries(offer.paypalPlanIds ?? {})) {
                if (planId === paypalPlanId) return priceId
            }
        }

        return null
    }

    all(): PlanOfferEntity[] {
        return [...this.byId.values()]
    }
}
