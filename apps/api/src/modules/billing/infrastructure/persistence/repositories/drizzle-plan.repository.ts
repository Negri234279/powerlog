import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { PlanAudience } from '../../../../../shared/contracts/entitlements'
import type { PlanAggregate } from '../../../domain/entities/plan.entity'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { toPlanAggregate, toPlanRow } from '../mappers/plan.mapper'
import { plans } from '../schema/plans.schema'

@Injectable()
export class DrizzlePlanRepository extends PlanRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async save(plan: PlanAggregate): Promise<void> {
        const row = toPlanRow(plan)

        await this.db
            .insert(plans)
            .values(row)
            .onConflictDoUpdate({
                target: plans.id,
                // audience/slug/is_free are not editable (see PlanAggregate.update).
                set: {
                    name: row.name,
                    description: row.description,
                    status: row.status,
                    sortOrder: row.sortOrder,
                    entitlements: row.entitlements,
                    stripeProductId: row.stripeProductId,
                    paypalProductId: row.paypalProductId,
                    updatedAt: row.updatedAt,
                },
            })
    }

    async findById(id: string): Promise<PlanAggregate | null> {
        const [row] = await this.db.select().from(plans).where(eq(plans.id, id)).limit(1)

        return row ? toPlanAggregate(row) : null
    }

    async findBySlug(slug: string): Promise<PlanAggregate | null> {
        const [row] = await this.db.select().from(plans).where(eq(plans.slug, slug)).limit(1)

        return row ? toPlanAggregate(row) : null
    }

    async findAll(audience?: PlanAudience): Promise<PlanAggregate[]> {
        const rows = await this.db
            .select()
            .from(plans)
            .where(audience ? eq(plans.audience, audience) : undefined)
            .orderBy(asc(plans.audience), asc(plans.sortOrder), asc(plans.slug))

        return rows.map(toPlanAggregate)
    }

    async findActiveFree(audience: PlanAudience): Promise<PlanAggregate | null> {
        const [row] = await this.db
            .select()
            .from(plans)
            .where(and(eq(plans.audience, audience), eq(plans.isFree, true), eq(plans.status, 'active')))
            .limit(1)

        return row ? toPlanAggregate(row) : null
    }
}
