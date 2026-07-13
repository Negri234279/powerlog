import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'

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
        trialDays: row.trialDays,
        introPhase: row.introPhase,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        active: row.active,
        stripeCouponId: row.stripeCouponId,
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
            trialDays: offer.trialDays,
            introPhase: offer.introPhase,
            startsAt: offer.startsAt,
            endsAt: offer.endsAt,
            active: offer.active,
            stripeCouponId: offer.stripeCouponId,
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
}
