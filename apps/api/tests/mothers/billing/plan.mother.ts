import { PlanAggregate, type PlanStatus } from '../../../src/modules/billing/domain/entities/plan.entity'

const NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Plans shaped like the seeded catalog: free plans train but don't get AI, paid
 * ones do. Every factory takes overrides so a test can say exactly what matters.
 */
export const PlanMother = {
    athleteFree(overrides: Partial<{ id: string; status: PlanStatus; ai: boolean; mesocycles: boolean }> = {}) {
        return PlanAggregate.create({
            id: overrides.id ?? 'plan-athlete-free',
            audience: 'athlete',
            slug: 'athlete-free',
            name: 'Free',
            status: overrides.status ?? 'active',
            isFree: true,
            entitlements: {
                templates: true,
                mesocycles: overrides.mesocycles ?? true,
                ai: overrides.ai ?? false,
            },
            now: NOW,
        })
    },

    athletePro(overrides: Partial<{ id: string; status: PlanStatus }> = {}) {
        return PlanAggregate.create({
            id: overrides.id ?? 'plan-athlete-pro',
            audience: 'athlete',
            slug: 'athlete-pro',
            name: 'Pro',
            status: overrides.status ?? 'active',
            entitlements: { templates: true, mesocycles: true, ai: true },
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
                athlete: { templates: true, mesocycles: true, ai: overrides.ai ?? false },
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
                athlete: { templates: true, mesocycles: true, ai: true },
            },
            now: NOW,
        })
    },
}
