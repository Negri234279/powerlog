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
} from '../../../src/shared/contracts/entitlements'

/**
 * Entitlements double that behaves like the real adapter — it decides from a
 * plan snapshot instead of from injected errors, so a test says "put this user on
 * a plan without AI" and gets the same `FEATURE_NOT_IN_PLAN` a free user would.
 *
 * Defaults to unlimited plans on **both** audiences, so handlers under test that
 * don't care about limits need no setup. `onAthlete`/`onCoach` override the
 * matching section; `withoutCoach()` models a user with no coaching at all.
 */
export class FakeEntitlements extends Entitlements {
    private athlete: AthleteEntitlementsSection = {
        plan: 'test-athlete-unlimited',
        maxTemplates: null,
        maxMesocycles: null,
        maxWorkouts: null,
        ai: true,
    }

    private coach: CoachEntitlementsSection | null = {
        plan: 'test-coach-unlimited',
        maxAthletes: null,
        planSessions: true,
        maxTemplates: null,
        maxMesocycles: null,
        ai: true,
    }

    /** Put the user on an athlete plan: everything allowed except what you override. */
    onAthlete(section: Partial<AthleteEntitlementsSection>): this {
        this.athlete = { ...this.athlete, ...section }

        return this
    }

    /** Put the user on a coach plan: everything allowed except what you override. */
    onCoach(section: Partial<CoachEntitlementsSection>): this {
        this.coach = {
            ...(this.coach ?? {
                plan: 'test-coach-unlimited',
                maxAthletes: null,
                planSessions: true,
                maxTemplates: null,
                maxMesocycles: null,
                ai: true,
            }),
            ...section,
        }

        return this
    }

    /** A user with no coach section at all (plain athlete). */
    withoutCoach(): this {
        this.coach = null

        return this
    }

    assertFeature<A extends PlanAudience>(_userId: string, audience: A, feature: FeatureOf<A>): Promise<void> {
        const section = this.section(audience)
        if (section && this.grants(section, feature)) return Promise.resolve()

        return Promise.reject(new FeatureNotInPlanError(feature, section?.plan ?? 'none', audience))
    }

    assertCanAddAthlete(_coachId: string, currentAthleteCount: number): Promise<void> {
        // null = unlimited; no coach section at all = cap 0 (same as the real adapter).
        if (this.coach) {
            const { maxAthletes } = this.coach
            if (maxAthletes === null || currentAthleteCount < maxAthletes) return Promise.resolve()
        }

        return Promise.reject(
            new PlanLimitReachedError(
                'athletes',
                this.coach?.maxAthletes ?? 0,
                currentAthleteCount,
                this.coach?.plan ?? 'none',
                'coach',
            ),
        )
    }

    assertWithinLimit<A extends PlanAudience>(
        _userId: string,
        audience: A,
        resource: ResourceOf<A>,
        currentCount: number,
    ): Promise<void> {
        const section = this.section(audience)
        const limit = section ? this.limitFor(section, resource) : 0
        if (section && (limit === null || currentCount < limit)) return Promise.resolve()

        return Promise.reject(
            new PlanLimitReachedError(resource, limit ?? 0, currentCount, section?.plan ?? 'none', audience),
        )
    }

    forUser(): Promise<EntitlementsSnapshot> {
        return Promise.resolve({ athlete: this.athlete, coach: this.coach })
    }

    private section(audience: PlanAudience): AthleteEntitlementsSection | CoachEntitlementsSection | null {
        return audience === 'coach' ? this.coach : this.athlete
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
