import { DomainError } from '../domain/domain-error'

/**
 * Cross-cutting seam for subscription-plan limits. Feature handlers route every
 * limitable action through this port instead of hard-coding caps, so the plan
 * model lives in one place (the billing module) and the call sites never learn
 * about plans, subscriptions or gateways.
 *
 * The port is deliberately flat: a handler asks "may this user do X", not "what
 * plan are they on". Billing answers by collapsing the user's plan — or the free
 * plan of their audience when they have no live subscription — into the snapshot
 * below.
 *
 * The two errors live here, with the port, because they are part of its contract:
 * whoever calls `assertFeature` must expect `FEATURE_NOT_IN_PLAN`, and the
 * adapter that throws them sits outside the billing module.
 */

/** The gateable features. A closed union so a typo can't silently allow. */
export type Feature = 'templates' | 'mesocycles' | 'ai' | 'plan_sessions'

/** Which catalog a plan belongs to. Picks the free plan when there's no subscription. */
export type PlanAudience = 'athlete' | 'coach'

/**
 * A user's effective entitlements, already collapsed from their plan. A coach
 * plan nests the athlete section (its holder trains too); billing merges it in,
 * so consumers never see the nesting.
 *
 * `maxAthletes: null` means unlimited; `0` means the plan does no coaching.
 */
export interface EntitlementsSnapshot {
    /** Slug of the plan these came from — for upgrade CTAs and metric labels. */
    plan: string
    audience: PlanAudience
    templates: boolean
    mesocycles: boolean
    ai: boolean
    planSessions: boolean
    maxAthletes: number | null
}

/**
 * The user asked for a feature their plan does not include. Carries the feature
 * so the web can render an upgrade CTA for the thing they actually wanted.
 */
export class FeatureNotInPlanError extends DomainError {
    readonly code = 'FEATURE_NOT_IN_PLAN'

    constructor(
        readonly feature: Feature,
        readonly plan: string,
    ) {
        super('Your plan does not include this feature.')
    }

    // The web needs the feature to send the user to the upgrade that unlocks THIS,
    // rather than to a generic pricing page.
    override get details(): Record<string, unknown> {
        return {
            feature: this.feature,
            plan: this.plan,
        }
    }
}

/** The user is at their plan's cap for something countable (today: athletes). */
export class PlanLimitReachedError extends DomainError {
    readonly code = 'PLAN_LIMIT_REACHED'

    constructor(
        readonly limit: number,
        readonly current: number,
        readonly plan: string,
    ) {
        super('You have reached the limit of your plan.')
    }

    override get details(): Record<string, unknown> {
        return {
            limit: this.limit,
            current: this.current,
            plan: this.plan,
        }
    }
}

export abstract class Entitlements {
    /**
     * Assert the user's plan includes `feature`; throws {@link FeatureNotInPlanError}.
     * The user is whoever performs the action — when a coach programs for an
     * athlete, it is the coach's plan that pays for it.
     */
    abstract assertFeature(userId: string, feature: Feature): Promise<void>

    /**
     * Assert the coach may take on one more athlete under their current plan.
     * `currentAthleteCount` is how many are already linked; throws
     * {@link PlanLimitReachedError} when the cap would be exceeded.
     */
    abstract assertCanAddAthlete(coachId: string, currentAthleteCount: number): Promise<void>

    /**
     * The user's effective entitlements — for showing the plan in the UI, never
     * for gating: the authority is the assertions above, on the server.
     */
    abstract forUser(userId: string): Promise<EntitlementsSnapshot>
}
