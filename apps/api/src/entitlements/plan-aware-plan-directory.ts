import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

import { GetPlanMembershipQuery } from '../shared/contracts/get-plan-membership.query'
import { type PlanMembership, PlanDirectory } from '../shared/contracts/plan-membership'

/**
 * The real {@link PlanDirectory}: it asks billing over the QueryBus, exactly like
 * {@link PlanAwareEntitlements}, so the modules that filter by plan never import
 * billing.
 *
 * Not cached, unlike the entitlements adapter. That one answers the same question
 * about the same user on every page load; this one answers an admin's ad-hoc plan
 * filter, which is rare and whose whole point is to be current — a stale answer
 * would show an admin a user under the plan they just changed.
 */
@Injectable()
export class PlanAwarePlanDirectory extends PlanDirectory {
    constructor(private readonly queryBus: QueryBus) {
        super()
    }

    async membership(planSlugs: string[]): Promise<PlanMembership> {
        const query = new GetPlanMembershipQuery(planSlugs)

        return this.queryBus.execute<GetPlanMembershipQuery, PlanMembership>(query)
    }
}
