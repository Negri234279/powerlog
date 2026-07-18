import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type {
    AthleteEntitlementsSection,
    CoachEntitlementsSection,
    EntitlementsSnapshot,
} from '../../../../../shared/contracts/entitlements'
import { GetUserEntitlementsQuery } from '../../../../../shared/contracts/get-user-entitlements.query'
import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { AthleteEntitlementsVO } from '../../../domain/value-objects/athlete-entitlements.vo'
import { CoachEntitlementsVO } from '../../../domain/value-objects/coach-entitlements.vo'
import { FreePlanMissingError, PlanNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import { Clock } from '../../ports/clock.port'

/**
 * Resolves what a user may do. The only reader of the plan model outside billing
 * (through the QueryBus), and therefore the single place the fallback rule lives.
 *
 * Athlete and coach plans are independent subscriptions, so the two sections of
 * the snapshot resolve independently: each audience takes its own entitling
 * subscription's plan, or falls back to that audience's free plan. The athlete
 * section always exists — everyone trains. The coach section exists for coaches
 * (by role) and for anyone holding a live coach subscription (the subscription
 * wins over the role); for everyone else it is `null`, which is what tells the
 * UI there is no coach plan area to render.
 *
 * Never throws for a user who simply doesn't pay: no live subscription means the
 * free plan of the audience. It throws only on a broken catalog — a subscription
 * pointing at a plan that isn't there, or an audience with no free plan — which
 * is a misconfiguration, not a user error.
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
        const now = this.clock.now()

        // A canceled subscription keeps its plan until the period it paid for runs
        // out, so "live" isn't enough — ask each aggregate.
        const live = await this.subscriptions.findAllLiveByUser(query.userId)
        const entitled = live.filter((subscription) => subscription.isEntitledAt(now))

        let athlete: AthleteEntitlementsSection | undefined
        let coach: CoachEntitlementsSection | undefined

        for (const subscription of entitled) {
            const plan = await this.plans.findById(subscription.planId)
            if (!plan) throw new PlanNotFoundError()

            // Read from the plan as it is NOW, not as it was when they signed:
            // editing a plan's features reaches its subscribers immediately. Prices
            // are the ones that are frozen per version.
            if (plan.entitlements instanceof CoachEntitlementsVO) {
                coach = plan.entitlements.toSection(plan.slug)
            } else if (plan.entitlements instanceof AthleteEntitlementsVO) {
                athlete = plan.entitlements.toSection(plan.slug)
            }
        }

        // Everyone trains: no athlete subscription means the free athlete plan —
        // including coaches, whose coach plan buys them no personal training.
        athlete ??= await this.freeAthleteSection()

        // Coaching needs earning: the role opens the free coach fallback, and a
        // live coach subscription counts even without the role (the plan wins).
        if (!coach) {
            const role = (await this.users.getRole(query.userId)) ?? 'athlete'
            if (role === 'coach') coach = await this.freeCoachSection()
        }

        return {
            athlete,
            coach: coach ?? null,
        }
    }

    private async freeAthleteSection(): Promise<AthleteEntitlementsSection> {
        const free = await this.plans.findActiveFree('athlete')
        if (!free || !(free.entitlements instanceof AthleteEntitlementsVO)) throw new FreePlanMissingError('athlete')

        return free.entitlements.toSection(free.slug)
    }

    private async freeCoachSection(): Promise<CoachEntitlementsSection> {
        const free = await this.plans.findActiveFree('coach')
        if (!free || !(free.entitlements instanceof CoachEntitlementsVO)) throw new FreePlanMissingError('coach')

        return free.entitlements.toSection(free.slug)
    }
}
