import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import {
    type AthleteEntitlementsSection,
    type CoachEntitlementsSection,
    type EntitlementsSnapshot,
    type Feature,
    type FeatureOf,
    type PlanAudience,
    type ResourceOf,
    Entitlements,
    FeatureNotInPlanError,
    PlanLimitReachedError,
} from '../shared/contracts/entitlements'
import { GetUserEntitlementsQuery } from '../shared/contracts/get-user-entitlements.query'
import { METRIC } from '../observability/metrics'
import { EntitlementsCache } from './entitlements.cache'

/**
 * The real {@link Entitlements}: it answers from the user's plans — the section
 * of the snapshot named by the gate's audience, since athlete and coach plans are
 * independent subscriptions.
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

    async assertFeature<A extends PlanAudience>(userId: string, audience: A, feature: FeatureOf<A>): Promise<void> {
        const snapshot = await this.forUser(userId)
        const section = this.section(snapshot, audience)

        if (section && this.grants(section, feature)) return

        const plan = section?.plan ?? 'none'
        this.denials.inc({ feature, audience, plan })

        throw new FeatureNotInPlanError(feature, plan, audience)
    }

    async assertCanAddAthlete(coachId: string, currentAthleteCount: number): Promise<void> {
        const snapshot = await this.forUser(coachId)
        const coach = snapshot.coach

        // null = unlimited. A user with no coach section coaches nobody (cap 0) —
        // the role guards upstream should make that unreachable, but a plan gate
        // that fails open is not a gate.
        if (coach) {
            const { maxAthletes } = coach
            if (maxAthletes === null || currentAthleteCount < maxAthletes) return
        }

        const plan = coach?.plan ?? 'none'
        this.denials.inc({ feature: 'athletes', audience: 'coach', plan })

        throw new PlanLimitReachedError('athletes', coach?.maxAthletes ?? 0, currentAthleteCount, plan, 'coach')
    }

    async assertWithinLimit<A extends PlanAudience>(
        userId: string,
        audience: A,
        resource: ResourceOf<A>,
        currentCount: number,
    ): Promise<void> {
        const snapshot = await this.forUser(userId)
        const section = this.section(snapshot, audience)
        const limit = section ? this.limitFor(section, resource) : 0

        // null = unlimited.
        if (section && (limit === null || currentCount < limit)) return

        const plan = section?.plan ?? 'none'
        this.denials.inc({ feature: resource, audience, plan })

        throw new PlanLimitReachedError(resource, limit ?? 0, currentCount, plan, audience)
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

    /** The section the gate's audience draws on. `null` = the user has no plan there. */
    private section(
        snapshot: EntitlementsSnapshot,
        audience: PlanAudience,
    ): AthleteEntitlementsSection | CoachEntitlementsSection | null {
        return audience === 'coach' ? snapshot.coach : snapshot.athlete
    }

    private grants(section: AthleteEntitlementsSection | CoachEntitlementsSection, feature: Feature): boolean {
        switch (feature) {
            case 'ai':
                return section.ai
            case 'plan_sessions':
                return 'planSessions' in section && section.planSessions
        }
    }

    private limitFor(
        section: AthleteEntitlementsSection | CoachEntitlementsSection,
        resource: ResourceOf<PlanAudience>,
    ): number | null {
        switch (resource) {
            case 'templates':
                return section.maxTemplates
            case 'mesocycles':
                return section.maxMesocycles
            case 'workouts':
                return 'maxWorkouts' in section ? section.maxWorkouts : 0
        }
    }
}
