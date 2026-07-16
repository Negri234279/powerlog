import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { GetPlanMembershipQuery } from '../../../../../shared/contracts/get-plan-membership.query'
import type { PlanAudience } from '../../../../../shared/contracts/entitlements'
import type { PlanMembership } from '../../../../../shared/contracts/plan-membership'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { PlanMembershipReadModel } from '../../ports/plan-membership.read-model'
import { Clock } from '../../ports/clock.port'

/**
 * The set-shaped side of the plan model, and the only other place the fallback
 * rule lives — `GetUserEntitlementsHandler` applies it per user, this one applies
 * it to a selection of plans.
 *
 * It never throws on a catalog that can't answer: a slug that no longer exists,
 * or a free plan that has been archived, simply matches nobody. An admin filtering
 * a listing gets an empty result, which is the truth, rather than a page that
 * won't load.
 */
@QueryHandler(GetPlanMembershipQuery)
export class GetPlanMembershipHandler implements IQueryHandler<GetPlanMembershipQuery, PlanMembership> {
    constructor(
        private readonly readModel: PlanMembershipReadModel,
        private readonly plans: PlanRepository,
        private readonly clock: Clock,
    ) {}

    async execute(query: GetPlanMembershipQuery): Promise<PlanMembership> {
        const selected = [...new Set(query.planSlugs)]
        if (selected.length === 0) return { subscriberIds: [], freeAudiences: [], entitledUserIds: [] }

        const [entitled, picked] = await Promise.all([
            this.readModel.entitledSubscribers(this.clock.now()),
            Promise.all(selected.map((slug) => this.plans.findBySlug(slug))),
        ])

        // Only an ACTIVE free plan is a fallback: `GetUserEntitlementsHandler`
        // reaches for it through `findActiveFree`, so an archived one entitles
        // nobody and must not sweep up its audience here either.
        const freeAudiences = new Set<PlanAudience>()
        for (const plan of picked) {
            if (plan?.isFree && plan.status === 'active') freeAudiences.add(plan.audience)
        }

        const wanted = new Set(selected)
        const subscriberIds = entitled.filter((row) => wanted.has(row.planSlug)).map((row) => row.userId)

        return {
            subscriberIds,
            freeAudiences: [...freeAudiences],
            entitledUserIds: entitled.map((row) => row.userId),
        }
    }
}
