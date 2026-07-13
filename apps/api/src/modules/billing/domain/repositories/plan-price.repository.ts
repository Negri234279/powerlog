import type { PlanPriceEntity } from '../entities/plan-price.entity'
import type { Currency, PlanInterval } from '../plan-interval'

/** Persistence port for plan prices. */
export abstract class PlanPriceRepository {
    abstract save(price: PlanPriceEntity): Promise<void>

    abstract findById(id: string): Promise<PlanPriceEntity | null>

    /** Every price of these plans, active or not (the admin sees the versions). */
    abstract findByPlans(planIds: string[]): Promise<PlanPriceEntity[]>

    /** The price currently on sale for a combo, if any. */
    abstract findActive(planId: string, interval: PlanInterval, currency: Currency): Promise<PlanPriceEntity | null>
}
