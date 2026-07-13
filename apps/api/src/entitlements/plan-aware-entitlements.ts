import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import {
    type EntitlementsSnapshot,
    Entitlements,
    type Feature,
    FeatureNotInPlanError,
    PlanLimitReachedError,
} from '../shared/contracts/entitlements'
import { GetUserEntitlementsQuery } from '../shared/contracts/get-user-entitlements.query'
import { METRIC } from '../observability/metrics'

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

        throw new PlanLimitReachedError(maxAthletes, currentAthleteCount, snapshot.plan)
    }

    forUser(userId: string): Promise<EntitlementsSnapshot> {
        const query = new GetUserEntitlementsQuery(userId)

        return this.queryBus.execute<GetUserEntitlementsQuery, EntitlementsSnapshot>(query)
    }

    private grants(snapshot: EntitlementsSnapshot, feature: Feature): boolean {
        switch (feature) {
            case 'templates':
                return snapshot.templates
            case 'mesocycles':
                return snapshot.mesocycles
            case 'ai':
                return snapshot.ai
            case 'plan_sessions':
                return snapshot.planSessions
        }
    }
}
