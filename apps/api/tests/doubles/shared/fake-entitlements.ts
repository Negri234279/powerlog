import {
    type EntitlementsSnapshot,
    Entitlements,
    type Feature,
    FeatureNotInPlanError,
    PlanLimitReachedError,
} from '../../../src/shared/contracts/entitlements'

/**
 * Entitlements double that behaves like the real adapter — it decides from a
 * plan snapshot instead of from injected errors, so a test says "put this user on
 * a plan without AI" and gets the same `FEATURE_NOT_IN_PLAN` a free user would.
 *
 * Defaults to an unlimited plan, so handlers under test that don't care about
 * limits need no setup.
 */
export class FakeEntitlements extends Entitlements {
    private snapshot: EntitlementsSnapshot = {
        plan: 'test-unlimited',
        audience: 'coach',
        templates: true,
        mesocycles: true,
        ai: true,
        planSessions: true,
        maxAthletes: null,
    }

    /** Put the user on a plan: everything allowed except what you override. */
    on(plan: Partial<EntitlementsSnapshot>): this {
        this.snapshot = { ...this.snapshot, ...plan }

        return this
    }

    assertFeature(_userId: string, feature: Feature): Promise<void> {
        if (this.grants(feature)) return Promise.resolve()

        return Promise.reject(new FeatureNotInPlanError(feature, this.snapshot.plan))
    }

    assertCanAddAthlete(_coachId: string, currentAthleteCount: number): Promise<void> {
        const { maxAthletes } = this.snapshot
        if (maxAthletes === null || currentAthleteCount < maxAthletes) return Promise.resolve()

        return Promise.reject(new PlanLimitReachedError(maxAthletes, currentAthleteCount, this.snapshot.plan))
    }

    forUser(): Promise<EntitlementsSnapshot> {
        return Promise.resolve(this.snapshot)
    }

    private grants(feature: Feature): boolean {
        switch (feature) {
            case 'templates':
                return this.snapshot.templates
            case 'mesocycles':
                return this.snapshot.mesocycles
            case 'ai':
                return this.snapshot.ai
            case 'plan_sessions':
                return this.snapshot.planSessions
        }
    }
}
