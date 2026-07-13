import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { EntitlementsSnapshot } from '../../../../../shared/contracts/entitlements'
import { GetUserEntitlementsQuery } from '../../../../../shared/contracts/get-user-entitlements.query'
import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { FreePlanMissingError, PlanNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import { Clock } from '../../ports/clock.port'

/**
 * Resolves what a user may do. The only reader of the plan model outside billing
 * (through the QueryBus), and therefore the single place the fallback rule lives.
 *
 * Never throws for a user who simply doesn't pay: no live subscription means the
 * free plan of their audience. It throws only on a broken catalog — a
 * subscription pointing at a plan that isn't there, or an audience with no free
 * plan — which is a misconfiguration, not a user error.
 */
@QueryHandler(GetUserEntitlementsQuery)
export class GetUserEntitlementsHandler implements IQueryHandler<GetUserEntitlementsQuery, EntitlementsSnapshot> {
    constructor(
        private readonly subscriptions: SubscriptionRepository,
        private readonly plans: PlanRepository,
        private readonly users: UserDirectory,
        private readonly clock: Clock,
    ) {}

    async execute(query: GetUserEntitlementsQuery): Promise<EntitlementsSnapshot> {
        const subscription = await this.subscriptions.findLiveByUser(query.userId)

        // A canceled subscription keeps its plan until the period it paid for runs
        // out, so "live" isn't enough — ask the aggregate.
        if (subscription?.isEntitledAt(this.clock.now())) {
            const plan = await this.plans.findById(subscription.planId)
            if (!plan) throw new PlanNotFoundError()

            // Read from the plan as it is NOW, not as it was when they signed:
            // editing a plan's features reaches its subscribers immediately. Prices
            // are the ones that are frozen per version.
            return plan.entitlements.toSnapshot(plan.slug)
        }

        // The role picks the catalog: a coach without a subscription falls back to
        // the free coach plan, which also covers their own training.
        const role = (await this.users.getRole(query.userId)) ?? 'athlete'
        const free = await this.plans.findActiveFree(role)
        if (!free) throw new FreePlanMissingError(role)

        return free.entitlements.toSnapshot(free.slug)
    }
}
