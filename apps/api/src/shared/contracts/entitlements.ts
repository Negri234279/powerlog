import { DomainError } from '../domain/domain-error'

/**
 * Cross-cutting seam for subscription-plan limits. Feature handlers route every
 * limitable action through this port instead of hard-coding caps, so the plan
 * model lives in one place (the billing module) and the call sites never learn
 * about plans, subscriptions or gateways.
 *
 * Athlete and coach plans are **independent subscriptions**: a coach may hold one
 * of each at the same time, and each action is paid by the plan of its audience —
 * logging your own training draws on the athlete plan, programming for athletes
 * draws on the coach plan. So a handler asks "may this user do X **as** athlete /
 * coach", and billing answers from the matching section of the snapshot below.
 *
 * The two errors live here, with the port, because they are part of its contract:
 * whoever calls `assertFeature` must expect `FEATURE_NOT_IN_PLAN`, and the
 * adapter that throws them sits outside the billing module.
 */

/** Which catalog a plan belongs to — and which section of a snapshot pays a gate. */
export type PlanAudience = 'athlete' | 'coach'

/** Boolean-gated features of an athlete plan. */
export type AthleteFeature = 'ai'
/** Boolean-gated features of a coach plan. */
export type CoachFeature = 'ai' | 'plan_sessions'
export type Feature = AthleteFeature | CoachFeature

/** The feature names valid for an audience — so a typo'd pairing fails to compile. */
export type FeatureOf<A extends PlanAudience> = A extends 'coach' ? CoachFeature : AthleteFeature

/** What an athlete plan caps by count (the user's own training). */
export type AthleteResource = 'templates' | 'mesocycles' | 'workouts'
/** What a coach plan caps by count (material built for their athletes). */
export type CoachResource = 'templates' | 'mesocycles'
export type CountableResource = AthleteResource | CoachResource

/** The countable resources valid for an audience — compiler-held, like {@link FeatureOf}. */
export type ResourceOf<A extends PlanAudience> = A extends 'coach' ? CoachResource : AthleteResource

/**
 * What the user's athlete plan grants: their own training. Every `max*` is a cap
 * on how many they may create — `null` = unlimited, `0` = none.
 */
export interface AthleteEntitlementsSection {
    /** Slug of the plan this section came from — for upgrade CTAs and metric labels. */
    plan: string
    maxTemplates: number | null
    maxMesocycles: number | null
    maxWorkouts: number | null
    ai: boolean
}

/**
 * What the user's coach plan grants: coaching only. `maxTemplates`/`maxMesocycles`
 * cap the material built **for athletes**, not the coach's own training (that is
 * the athlete section's job); `ai` is the assistant when designing for athletes.
 */
export interface CoachEntitlementsSection {
    /** Slug of the plan this section came from. */
    plan: string
    maxAthletes: number | null
    planSessions: boolean
    maxTemplates: number | null
    maxMesocycles: number | null
    ai: boolean
}

/**
 * A user's effective entitlements: one section per audience, resolved
 * independently (each from its own subscription, falling back to that audience's
 * free plan). `coach` is `null` for users who do no coaching at all — that is
 * what tells the UI not to render a coach plan area.
 */
export interface EntitlementsSnapshot {
    athlete: AthleteEntitlementsSection
    coach: CoachEntitlementsSection | null
}

/**
 * The user asked for a feature their plan does not include. Carries the feature
 * and its audience so the web can render an upgrade CTA for the thing they
 * actually wanted, in the catalog that sells it.
 */
export class FeatureNotInPlanError extends DomainError {
    readonly code = 'FEATURE_NOT_IN_PLAN'

    constructor(
        readonly feature: Feature,
        readonly plan: string,
        readonly audience: PlanAudience,
    ) {
        super('Your plan does not include this feature.')
    }

    // The web needs the feature to send the user to the upgrade that unlocks THIS,
    // rather than to a generic pricing page.
    override get details(): Record<string, unknown> {
        return {
            feature: this.feature,
            plan: this.plan,
            audience: this.audience,
        }
    }
}

/** The user is at their plan's cap for something countable (athletes, templates,
 *  mesocycles, workouts). Carries `resource` and `audience` so the web can point
 *  the upgrade at the exact thing they ran out of. */
export class PlanLimitReachedError extends DomainError {
    readonly code = 'PLAN_LIMIT_REACHED'

    constructor(
        readonly resource: CountableResource | 'athletes',
        readonly limit: number,
        readonly current: number,
        readonly plan: string,
        readonly audience: PlanAudience,
    ) {
        super('You have reached the limit of your plan.')
    }

    override get details(): Record<string, unknown> {
        return {
            resource: this.resource,
            limit: this.limit,
            current: this.current,
            plan: this.plan,
            audience: this.audience,
        }
    }
}

export abstract class Entitlements {
    /**
     * Assert the plan of `audience` includes `feature`; throws
     * {@link FeatureNotInPlanError}. The user is whoever performs the action, and
     * the audience says which of their plans pays for it: a coach programming for
     * an athlete asserts against `'coach'`, one training themselves against
     * `'athlete'`. The generic pins feature to audience at compile time.
     */
    abstract assertFeature<A extends PlanAudience>(userId: string, audience: A, feature: FeatureOf<A>): Promise<void>

    /**
     * Assert the coach may take on one more athlete under their coach plan.
     * `currentAthleteCount` is how many are already linked; throws
     * {@link PlanLimitReachedError} when the cap would be exceeded.
     */
    abstract assertCanAddAthlete(coachId: string, currentAthleteCount: number): Promise<void>

    /**
     * Assert the user may create one more of `resource` under the plan of
     * `audience`. `currentCount` is how many they already own **in that scope** —
     * a coach's own mesocycles count against their athlete plan, the ones they
     * build for athletes against their coach plan. Throws
     * {@link PlanLimitReachedError} when the cap would be exceeded. Only creating
     * is gated: a soft downgrade leaves what they have, it just stops them making
     * more.
     */
    abstract assertWithinLimit<A extends PlanAudience>(
        userId: string,
        audience: A,
        resource: ResourceOf<A>,
        currentCount: number,
    ): Promise<void>

    /**
     * The user's effective entitlements — for showing the plan in the UI, never
     * for gating: the authority is the assertions above, on the server.
     */
    abstract forUser(userId: string): Promise<EntitlementsSnapshot>
}
