import type { INestApplication } from '@nestjs/common'
import type { Pool } from 'pg'

import { EntitlementsCache } from '../../src/entitlements/entitlements.cache'

/**
 * Put a user on a plan of the seeded catalog, the way an admin comp does: a
 * `manual` subscription, no gateway involved.
 *
 * e2e suites that exercise a paid feature (AI, today) need this — a fresh user is
 * on the free plan, which is exactly what the enforcement tests rely on. Granting
 * through a real subscription row keeps the entitlement resolution honest: no
 * provider is overridden, the real query runs against real Postgres.
 *
 * **It also drops the entitlements cache**, because writing the row in SQL skips
 * the command that would normally announce it. The app is not being worked around
 * here — an admin grant publishes `SubscriptionChanged` and the cache reacts to
 * that; this helper is just doing by hand what the missing command would have done.
 */
export async function grantPlan(app: INestApplication, pool: Pool, userId: string, slug: string): Promise<void> {
    const { rowCount } = await pool.query(
        `INSERT INTO subscriptions (user_id, plan_id, audience, gateway, status, current_period_start, current_period_end)
         SELECT $1::uuid, p.id, p.audience, 'manual', 'active', now(), now() + interval '30 days'
         FROM plans p WHERE p.slug = $2`,
        [userId, slug],
    )

    // A typo in the slug would silently leave the user on free and fail the test
    // somewhere far away from the cause.
    if (rowCount !== 1) throw new Error(`grantPlan: no plan with slug "${slug}"`)

    await invalidateEntitlements(app, userId)
}

/** Forget what the app remembers about this user's plan (after a raw SQL change). */
export async function invalidateEntitlements(app: INestApplication, userId: string): Promise<void> {
    await app.get(EntitlementsCache).invalidate(userId)
}
