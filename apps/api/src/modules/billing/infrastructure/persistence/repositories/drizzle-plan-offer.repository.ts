import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { PlanOfferEntity } from '../../../domain/entities/plan-offer.entity'
import { PlanOfferRepository } from '../../../domain/repositories/plan-offer.repository'
import { planOffers } from '../schema/plan-offers.schema'

type OfferRow = typeof planOffers.$inferSelect

function toEntity(row: OfferRow): PlanOfferEntity {
    return PlanOfferEntity.rehydrate({
        id: row.id,
        planId: row.planId,
        name: row.name,
        message: row.message,
        trialDays: row.trialDays,
        introPhase: row.introPhase,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        active: row.active,
        stripeCouponId: row.stripeCouponId,
        paypalPlanIds: row.paypalPlanIds,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })
}

@Injectable()
export class DrizzlePlanOfferRepository extends PlanOfferRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async save(offer: PlanOfferEntity): Promise<void> {
        const row = {
            id: offer.id,
            planId: offer.planId,
            name: offer.name,
            message: offer.message,
            trialDays: offer.trialDays,
            introPhase: offer.introPhase,
            startsAt: offer.startsAt,
            endsAt: offer.endsAt,
            active: offer.active,
            stripeCouponId: offer.stripeCouponId,
            paypalPlanIds: offer.paypalPlanIds,
            createdAt: offer.createdAt,
            updatedAt: offer.updatedAt,
        }

        await this.db
            .insert(planOffers)
            .values(row)
            .onConflictDoUpdate({
                target: planOffers.id,
                // The terms are immutable: a different discount is a different offer
                // (its coupon is immutable at the gateway too). Only whether it is
                // live, and the coupon the sync created, can change.
                set: {
                    active: row.active,
                    stripeCouponId: row.stripeCouponId,
                    paypalPlanIds: row.paypalPlanIds,
                    updatedAt: row.updatedAt,
                },
            })
    }

    async findById(id: string): Promise<PlanOfferEntity | null> {
        const [row] = await this.db.select().from(planOffers).where(eq(planOffers.id, id)).limit(1)

        return row ? toEntity(row) : null
    }

    async findActiveByPlan(planId: string): Promise<PlanOfferEntity | null> {
        const [row] = await this.db
            .select()
            .from(planOffers)
            .where(and(eq(planOffers.planId, planId), eq(planOffers.active, true)))
            .limit(1)

        return row ? toEntity(row) : null
    }

    async findActiveByPlans(planIds: string[]): Promise<PlanOfferEntity[]> {
        if (planIds.length === 0) return []

        const rows = await this.db
            .select()
            .from(planOffers)
            .where(and(inArray(planOffers.planId, planIds), eq(planOffers.active, true)))

        return rows.map(toEntity)
    }

    async findByPlans(planIds: string[]): Promise<PlanOfferEntity[]> {
        if (planIds.length === 0) return []

        const rows = await this.db.select().from(planOffers).where(inArray(planOffers.planId, planIds))

        return rows.map(toEntity)
    }

    async findPriceIdByPaypalPlanId(paypalPlanId: string): Promise<string | null> {
        // `paypal_plan_ids` maps our price id → its PayPal offer plan. We have the
        // value and want the key, so scan the (bounded, admin-made) set of offers
        // that have any PayPal plans. Retired ones included, on purpose.
        const rows = await this.db
            .select({ paypalPlanIds: planOffers.paypalPlanIds })
            .from(planOffers)
            .where(isNotNull(planOffers.paypalPlanIds))

        for (const row of rows) {
            for (const [priceId, planId] of Object.entries(row.paypalPlanIds ?? {})) {
                if (planId === paypalPlanId) return priceId
            }
        }

        return null
    }
}
