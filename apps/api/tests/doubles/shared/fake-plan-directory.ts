import type { PlanAudience } from '../../../src/shared/contracts/entitlements'
import { type PlanMembership, PlanDirectory } from '../../../src/shared/contracts/plan-membership'

/**
 * PlanDirectory double that behaves like the real adapter: a test says who
 * subscribes to what, and this applies the same fallback rule billing does —
 * whoever is not subscribed is on the free plan of their audience.
 *
 * Defaults to nobody subscribed to anything, so a handler that doesn't filter by
 * plan needs no setup.
 */
export class FakePlanDirectory extends PlanDirectory {
    private readonly subscribers = new Map<string, string>()
    private readonly freePlans = new Map<string, PlanAudience>()

    /** Put a user on a paid plan, by slug. */
    subscribe(userId: string, planSlug: string): this {
        this.subscribers.set(userId, planSlug)

        return this
    }

    /** Declare `slug` the active free plan of `audience` — what non-payers get. */
    withFreePlan(slug: string, audience: PlanAudience): this {
        this.freePlans.set(slug, audience)

        return this
    }

    /** What the last `membership` call was asked for — for asserting pass-through. */
    lastAsked?: string[]

    membership(planSlugs: string[]): Promise<PlanMembership> {
        this.lastAsked = planSlugs
        const wanted = new Set(planSlugs)
        const subscriberIds: string[] = []
        const entitledUserIds: string[] = []

        for (const [userId, slug] of this.subscribers) {
            entitledUserIds.push(userId)
            if (wanted.has(slug)) subscriberIds.push(userId)
        }

        const freeAudiences = [...this.freePlans].filter(([slug]) => wanted.has(slug)).map(([, audience]) => audience)

        return Promise.resolve({ subscriberIds, freeAudiences, entitledUserIds })
    }
}
