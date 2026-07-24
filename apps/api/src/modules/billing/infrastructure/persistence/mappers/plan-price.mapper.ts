import { PlanPriceEntity } from '../../../domain/entities/plan-price.entity'
import type { Currency, PlanInterval } from '../../../domain/plan-interval'
import type { planPrices } from '../schema/plan-prices.schema'

type PlanPriceRow = typeof planPrices.$inferSelect
type PlanPriceInsert = typeof planPrices.$inferInsert

export function toPlanPriceEntity(row: PlanPriceRow): PlanPriceEntity {
    return PlanPriceEntity.rehydrate({
        id: row.id,
        planId: row.planId,
        interval: row.interval as PlanInterval,
        currency: row.currency as Currency,
        amountCents: row.amountCents,
        active: row.active,
        stripePriceId: row.stripePriceId,
        paypalPlanId: row.paypalPlanId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })
}

export function toPlanPriceRow(price: PlanPriceEntity): PlanPriceInsert {
    return {
        id: price.id,
        planId: price.planId,
        interval: price.interval,
        currency: price.currency,
        amountCents: price.amountCents,
        active: price.active,
        stripePriceId: price.stripePriceId,
        paypalPlanId: price.paypalPlanId,
        createdAt: price.createdAt,
        updatedAt: price.updatedAt,
    }
}
