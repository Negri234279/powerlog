import type { Pool } from 'pg'

/**
 * Put a user on a plan of the seeded catalog, the way an admin comp does: a
 * `manual` subscription, no gateway involved.
 *
 * e2e suites that exercise a paid feature (AI, today) need this — their users are
 * freshly registered, and a fresh user is on the free plan, which is exactly what
 * the enforcement tests rely on. Granting through a real subscription row keeps
 * the entitlement resolution honest: no provider is overridden, the real query
 * runs against real Postgres.
 */
export async function grantPlan(pool: Pool, userId: string, slug: string): Promise<void> {
    const { rowCount } = await pool.query(
        `INSERT INTO subscriptions (user_id, plan_id, gateway, status, current_period_start, current_period_end)
         SELECT $1::uuid, p.id, 'manual', 'active', now(), now() + interval '30 days'
         FROM plans p WHERE p.slug = $2`,
        [userId, slug],
    )

    // A typo in the slug would silently leave the user on free and fail the test
    // somewhere far away from the cause.
    if (rowCount !== 1) throw new Error(`grantPlan: no plan with slug "${slug}"`)
}
