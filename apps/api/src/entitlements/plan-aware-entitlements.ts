import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import {
    type CountableResource,
    type EntitlementsSnapshot,
    Entitlements,
    type Feature,
    FeatureNotInPlanError,
    PlanLimitReachedError,
} from '../shared/contracts/entitlements'
import { GetUserEntitlementsQuery } from '../shared/contracts/get-user-entitlements.query'
import { METRIC } from '../observability/metrics'
import { EntitlementsCache } from './entitlements.cache'

/**
 * The real {@link Entitlements}: it answers from the user's plan.
 *
 * Lives outside `src/modules/` and reaches billing over the **QueryBus**, so the
 * feature modules that gate on entitlements never import billing and billing
 * never imports them (same shape as the readers in `src/planning/`).
 *
 * Every denial is counted here — the one place they all pass through. A denial is
 * a user asking for something their plan doesn't include, which is the most direct
 * read there is on **which feature people would upgrade for**. (The global
 * exception filter already counts `domain_errors_total{code}`, but without the
 * feature dimension; this is a different cut, not a double count.)
 */
@Injectable()
export class PlanAwareEntitlements extends Entitlements {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly cache: EntitlementsCache,
        @InjectMetric(METRIC.entitlementDenials) private readonly denials: Counter<string>,
    ) {
        super()
    }

    async assertFeature(userId: string, feature: Feature): Promise<void> {
        const snapshot = await this.forUser(userId)
        if (this.grants(snapshot, feature)) return

        this.denials.inc({ feature, audience: snapshot.audience, plan: snapshot.plan })

        throw new FeatureNotInPlanError(feature, snapshot.plan)
    }

    async assertCanAddAthlete(coachId: string, currentAthleteCount: number): Promise<void> {
        const snapshot = await this.forUser(coachId)
        const { maxAthletes } = snapshot

        // null = unlimited.
        if (maxAthletes === null || currentAthleteCount < maxAthletes) return

        this.denials.inc({ feature: 'athletes', audience: snapshot.audience, plan: snapshot.plan })

        throw new PlanLimitReachedError('athletes', maxAthletes, currentAthleteCount, snapshot.plan)
    }

    async assertWithinLimit(userId: string, resource: CountableResource, currentCount: number): Promise<void> {
        const snapshot = await this.forUser(userId)
        const limit = this.limitFor(snapshot, resource)

        // null = unlimited.
        if (limit === null || currentCount < limit) return

        this.denials.inc({ feature: resource, audience: snapshot.audience, plan: snapshot.plan })

        throw new PlanLimitReachedError(resource, limit, currentCount, snapshot.plan)
    }

    /**
     * Cached for a minute, and dropped the instant the user's subscription moves —
     * the web asks this on every page load and every gated write asks again. A
     * cache miss (or a Redis that is down) just means asking billing, so this can
     * only ever make the app slower, never wrong.
     */
    async forUser(userId: string): Promise<EntitlementsSnapshot> {
        const cached = await this.cache.get(userId)
        if (cached) return cached

        const query = new GetUserEntitlementsQuery(userId)
        const snapshot = await this.queryBus.execute<GetUserEntitlementsQuery, EntitlementsSnapshot>(query)
        await this.cache.set(userId, snapshot)

        return snapshot
    }

    private grants(snapshot: EntitlementsSnapshot, feature: Feature): boolean {
        switch (feature) {
            case 'ai':
                return snapshot.ai
            case 'plan_sessions':
                return snapshot.planSessions
        }
    }

    private limitFor(snapshot: EntitlementsSnapshot, resource: CountableResource): number | null {
        switch (resource) {
            case 'templates':
                return snapshot.maxTemplates
            case 'mesocycles':
                return snapshot.maxMesocycles
            case 'workouts':
                return snapshot.maxWorkouts
        }
    }
}
