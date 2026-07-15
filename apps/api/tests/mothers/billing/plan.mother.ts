import { PlanAggregate, type PlanStatus } from '../../../src/modules/billing/domain/entities/plan.entity'

const NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Plans shaped like the seeded catalog: free plans train but don't get AI, paid
 * ones do. Every factory takes overrides so a test can say exactly what matters.
 */
/** Caps default to `null` (unlimited) so tests that don't care about limits stay
 *  simple; the limit tests pass the exact cap they exercise. */
type AthleteCaps = Partial<{ maxTemplates: number | null; maxMesocycles: number | null; maxWorkouts: number | null }>

function athleteEntitlements(caps: AthleteCaps, ai: boolean) {
    return {
        maxTemplates: caps.maxTemplates ?? null,
        maxMesocycles: caps.maxMesocycles ?? null,
        maxWorkouts: caps.maxWorkouts ?? null,
        ai,
    }
}

export const PlanMother = {
    athleteFree(overrides: Partial<{ id: string; status: PlanStatus; ai: boolean } & AthleteCaps> = {}) {
        return PlanAggregate.create({
            id: overrides.id ?? 'plan-athlete-free',
            audience: 'athlete',
            slug: 'athlete-free',
            name: 'Free',
            status: overrides.status ?? 'active',
            isFree: true,
            entitlements: athleteEntitlements(overrides, overrides.ai ?? false),
            now: NOW,
        })
    },

    athletePro(overrides: Partial<{ id: string; status: PlanStatus } & AthleteCaps> = {}) {
        return PlanAggregate.create({
            id: overrides.id ?? 'plan-athlete-pro',
            audience: 'athlete',
            slug: 'athlete-pro',
            name: 'Pro',
            status: overrides.status ?? 'active',
            entitlements: athleteEntitlements(overrides, true),
            now: NOW,
        })
    },

    coachFree(overrides: Partial<{ id: string; maxAthletes: number | null; ai: boolean }> = {}) {
        return PlanAggregate.create({
            id: overrides.id ?? 'plan-coach-free',
            audience: 'coach',
            slug: 'coach-free',
            name: 'Coach Free',
            status: 'active',
            isFree: true,
            entitlements: {
                maxAthletes: overrides.maxAthletes === undefined ? 3 : overrides.maxAthletes,
                planSessions: true,
                athlete: athleteEntitlements({}, overrides.ai ?? false),
            },
            now: NOW,
        })
    },

    coachPro(overrides: Partial<{ id: string; maxAthletes: number | null }> = {}) {
        return PlanAggregate.create({
            id: overrides.id ?? 'plan-coach-pro',
            audience: 'coach',
            slug: 'coach-pro',
            name: 'Coach Pro',
            status: 'active',
            entitlements: {
                maxAthletes: overrides.maxAthletes === undefined ? 20 : overrides.maxAthletes,
                planSessions: true,
                athlete: athleteEntitlements({}, true),
            },
            now: NOW,
        })
    },
}
