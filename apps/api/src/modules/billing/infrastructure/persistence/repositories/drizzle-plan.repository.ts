import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { PlanAudience } from '../../../../../shared/contracts/entitlements'
import type { PlanAggregate } from '../../../domain/entities/plan.entity'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { toPlanAggregate } from '../mappers/plan.mapper'
import { plans } from '../schema/plans.schema'

@Injectable()
export class DrizzlePlanRepository extends PlanRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async findById(id: string): Promise<PlanAggregate | null> {
        const [row] = await this.db.select().from(plans).where(eq(plans.id, id)).limit(1)

        return row ? toPlanAggregate(row) : null
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
