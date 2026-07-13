import type { PlanOfferEntity } from '../entities/plan-offer.entity'

/** Persistence port for plan offers. */
export abstract class PlanOfferRepository {
    abstract save(offer: PlanOfferEntity): Promise<void>

    abstract findById(id: string): Promise<PlanOfferEntity | null>

    /** The plan's live offer, if it has one (at most one — partial unique index). */
    abstract findActiveByPlan(planId: string): Promise<PlanOfferEntity | null>

    /** Live offers of these plans, for the catalog listing. */
    abstract findActiveByPlans(planIds: string[]): Promise<PlanOfferEntity[]>
}
