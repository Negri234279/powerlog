import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, inArray } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { PlanPriceEntity } from '../../../domain/entities/plan-price.entity'
import type { Currency, PlanInterval } from '../../../domain/plan-interval'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { toPlanPriceEntity, toPlanPriceRow } from '../mappers/plan-price.mapper'
import { planPrices } from '../schema/plan-prices.schema'

@Injectable()
export class DrizzlePlanPriceRepository extends PlanPriceRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async save(price: PlanPriceEntity): Promise<void> {
        const row = toPlanPriceRow(price)

        await this.db
            .insert(planPrices)
            .values(row)
            .onConflictDoUpdate({
                target: planPrices.id,
                // The amount is immutable: repricing inserts a new row. All that can
                // change on an existing one is whether it is on sale, and the gateway
                // ids the catalog sync fills in.
                set: {
                    active: row.active,
                    stripePriceId: row.stripePriceId,
                    paypalPlanId: row.paypalPlanId,
                    updatedAt: row.updatedAt,
                },
            })
    }

    async findById(id: string): Promise<PlanPriceEntity | null> {
        const [row] = await this.db.select().from(planPrices).where(eq(planPrices.id, id)).limit(1)

        return row ? toPlanPriceEntity(row) : null
    }

    async findByPlans(planIds: string[]): Promise<PlanPriceEntity[]> {
        if (planIds.length === 0) return []

        const rows = await this.db
            .select()
            .from(planPrices)
            .where(inArray(planPrices.planId, planIds))
            .orderBy(asc(planPrices.currency), asc(planPrices.interval), asc(planPrices.createdAt))

        return rows.map(toPlanPriceEntity)
    }

    async findActive(planId: string, interval: PlanInterval, currency: Currency): Promise<PlanPriceEntity | null> {
        const [row] = await this.db
            .select()
            .from(planPrices)
            .where(
                and(
                    eq(planPrices.planId, planId),
                    eq(planPrices.interval, interval),
                    eq(planPrices.currency, currency),
                    eq(planPrices.active, true),
                ),
            )
            .limit(1)

        return row ? toPlanPriceEntity(row) : null
    }
}
