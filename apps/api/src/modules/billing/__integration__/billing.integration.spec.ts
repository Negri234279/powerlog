import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { PlanAudience } from '../../../shared/contracts/entitlements'
import * as schema from '../../../database/schema'
import { SubscriptionAggregate } from '../domain/entities/subscription.entity'
import type { SubscriptionStatus } from '../domain/subscription-status'
import { DrizzleAdminBillingStatsReadModel } from '../infrastructure/persistence/read-models/drizzle-admin-billing-stats.read-model'
import { DrizzlePlanRepository } from '../infrastructure/persistence/repositories/drizzle-plan.repository'
import { DrizzleSubscriptionRepository } from '../infrastructure/persistence/repositories/drizzle-subscription.repository'

/**
 * The invariants Postgres holds and the aggregates cannot: they are statements
 * about the whole table, not about one row. Plus the seeded catalog itself — the
 * app cannot answer "what may this user do" without it.
 */

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let plans: DrizzlePlanRepository
let subscriptions: DrizzleSubscriptionRepository
let stats: DrizzleAdminBillingStatsReadModel

const PERIOD_START = new Date('2026-07-01T00:00:00.000Z')
const PERIOD_END = new Date('2026-08-01T00:00:00.000Z')

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    plans = new DrizzlePlanRepository(db)
    subscriptions = new DrizzleSubscriptionRepository(db)
    stats = new DrizzleAdminBillingStatsReadModel(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

/** The plans the seed migration ships. Tests may add their own; they may not touch these. */
const SEEDED = ['athlete-free', 'athlete-pro', 'coach-free', 'coach-pro', 'coach-elite']

beforeEach(async () => {
    // The seeded catalog is NOT truncated: it is what every user without a
    // subscription resolves to. What does get cleaned is anything a test added —
    // otherwise a test that adds a price would change the MRR another one reads.
    await db.execute(sql`TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE`)
    await pool.query(`DELETE FROM plans WHERE slug <> ALL($1::text[])`, [SEEDED])
})

/** A throwaway plan of the test's own, so the seeded catalog stays pristine. */
async function aTestPlan(slug: string): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO plans (audience, slug, name, status, entitlements)
         VALUES ('athlete', $1, 'Test plan', 'active',
                 '{"maxTemplates": null, "maxMesocycles": null, "maxWorkouts": null, "ai": true}'::jsonb)
         RETURNING id`,
        [slug],
    )

    return rows[0]!.id
}

async function planIdOf(slug: string): Promise<string> {
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM plans WHERE slug = $1', [slug])

    return rows[0]!.id
}

/**
 * The name of the constraint a write violated, or undefined if it succeeded.
 * Drizzle wraps the driver error, so the constraint lives on `cause` — asserting
 * on it (instead of on the message) says exactly WHICH invariant Postgres held.
 */
async function violatedConstraint(write: Promise<unknown>): Promise<string | undefined> {
    try {
        await write

        return undefined
    } catch (error) {
        return (error as { cause?: { constraint?: string } }).cause?.constraint
    }
}

function aSubscription(input: {
    userId: string
    planId: string
    audience?: PlanAudience
    status?: SubscriptionStatus
    gatewaySubscriptionId?: string
}): SubscriptionAggregate {
    return SubscriptionAggregate.create({
        id: randomUUID(),
        userId: input.userId,
        planId: input.planId,
        audience: input.audience ?? 'athlete',
        gateway: 'stripe',
        gatewaySubscriptionId: input.gatewaySubscriptionId ?? null,
        status: input.status ?? 'active',
        currentPeriodStart: PERIOD_START,
        currentPeriodEnd: PERIOD_END,
        now: PERIOD_START,
    })
}

describe('Billing catalog (integration)', () => {
    it('ships one active free plan per audience, so every user resolves to something', async () => {
        const athleteFree = await plans.findActiveFree('athlete')
        const coachFree = await plans.findActiveFree('coach')

        expect(athleteFree?.slug).toBe('athlete-free')
        expect(coachFree?.slug).toBe('coach-free')
        // The seeded shape of the product: free trains, AI is paid for.
        expect(athleteFree?.entitlements.publicView().ai).toBe(false)
        expect(coachFree?.entitlements.publicView().maxAthletes).toBe(3)
    })

    it('rehydrates the jsonb entitlements through the zod schema of the plan audience', async () => {
        const coachPro = await plans.findById(await planIdOf('coach-pro'))
        const view = coachPro!.entitlements.publicView()

        // The migrated coach shape is flat — coaching only, no nested athlete
        // section — and it survives the jsonb round-trip on real data, not just
        // in unit tests. Its ai/quotas carried over from the old nested values.
        expect(view).toMatchObject({ ai: true, planSessions: true, maxAthletes: 20, maxWorkouts: 0 })
    })

    it('refuses a second active free plan for the same audience', async () => {
        await expect(
            pool.query(
                `INSERT INTO plans (audience, slug, name, status, is_free, entitlements)
                 VALUES ('athlete', 'athlete-free-2', 'Free 2', 'active', true,
                         '{"maxTemplates": null, "maxMesocycles": null, "maxWorkouts": null, "ai": false}'::jsonb)`,
            ),
        ).rejects.toThrow(/plans_one_active_free_per_audience/)
    })

    it('allows an archived free plan alongside the active one (the history stays)', async () => {
        await expect(
            pool.query(
                `INSERT INTO plans (audience, slug, name, status, is_free, entitlements)
                 VALUES ('athlete', 'athlete-free-old', 'Free (old)', 'archived', true,
                         '{"maxTemplates": null, "maxMesocycles": 0, "maxWorkouts": null, "ai": false}'::jsonb)`,
            ),
        ).resolves.toBeDefined()
    })

    it('keeps only one active price per (plan, interval, currency)', async () => {
        const planId = await aTestPlan('test-priced')
        await pool.query(
            `INSERT INTO plan_prices (plan_id, interval, currency, amount_cents) VALUES ($1, 'month', 'EUR', 799)`,
            [planId],
        )

        await expect(
            pool.query(
                `INSERT INTO plan_prices (plan_id, interval, currency, amount_cents) VALUES ($1, 'month', 'EUR', 999)`,
                [planId],
            ),
        ).rejects.toThrow(/plan_prices_one_active_per_combo/)
    })

    it('lets a new price version replace a deactivated one', async () => {
        // How a price change is done: never an UPDATE — deactivate and insert, so the
        // subscriptions signed on the old version keep pointing at it.
        const planId = await aTestPlan('test-repriced')
        await pool.query(
            `INSERT INTO plan_prices (plan_id, interval, currency, amount_cents) VALUES ($1, 'month', 'EUR', 799)`,
            [planId],
        )
        await pool.query(
            `UPDATE plan_prices SET active = false WHERE plan_id = $1 AND interval = 'month' AND currency = 'EUR'`,
            [planId],
        )

        await expect(
            pool.query(
                `INSERT INTO plan_prices (plan_id, interval, currency, amount_cents) VALUES ($1, 'month', 'EUR', 999)`,
                [planId],
            ),
        ).resolves.toBeDefined()
    })
})

describe('Subscriptions (integration)', () => {
    it('allows only one live subscription per user and audience', async () => {
        const userId = randomUUID()
        const planId = await planIdOf('athlete-pro')
        await subscriptions.save(aSubscription({ userId, planId }))

        const violated = await violatedConstraint(subscriptions.save(aSubscription({ userId, planId })))

        expect(violated).toBe('subscriptions_one_live_per_user_audience')
    })

    it('lets a user hold a live athlete plan and a live coach plan at once', async () => {
        // The whole point of the per-audience index: a coach subscribes to a coach
        // plan for coaching AND an athlete plan for their own training.
        const userId = randomUUID()
        const athletePlan = await planIdOf('athlete-pro')
        const coachPlan = await planIdOf('coach-pro')

        await subscriptions.save(aSubscription({ userId, planId: athletePlan, audience: 'athlete' }))
        await subscriptions.save(
            aSubscription({ userId, planId: coachPlan, audience: 'coach', gatewaySubscriptionId: 'sub_coach_1' }),
        )

        const live = await subscriptions.findAllLiveByUser(userId)
        expect(live).toHaveLength(2)
        expect((await subscriptions.findLiveByUserAndAudience(userId, 'coach'))?.audience).toBe('coach')
        expect((await subscriptions.findLiveByUserAndAudience(userId, 'athlete'))?.audience).toBe('athlete')
    })

    it('still counts a canceled subscription as live, so nobody stacks one on paid time', async () => {
        const userId = randomUUID()
        const planId = await planIdOf('athlete-pro')
        await subscriptions.save(aSubscription({ userId, planId, status: 'canceled' }))

        const violated = await violatedConstraint(subscriptions.save(aSubscription({ userId, planId })))

        expect(violated).toBe('subscriptions_one_live_per_user_audience')
    })

    it('lets a user subscribe again once the previous one expired', async () => {
        const userId = randomUUID()
        const planId = await planIdOf('athlete-pro')
        await subscriptions.save(aSubscription({ userId, planId, status: 'expired' }))

        await subscriptions.save(aSubscription({ userId, planId }))

        // The expired row stays: the billing history is not rewritten.
        const { rows } = await pool.query('SELECT status FROM subscriptions WHERE user_id = $1', [userId])
        expect(rows).toHaveLength(2)
        expect((await subscriptions.findLiveByUser(userId))?.status).toBe('active')
    })

    it('rejects two subscriptions mirroring the same gateway subscription', async () => {
        // The webhook pipeline (9.3) leans on this: replaying an event must not be
        // able to create a second local row for one Stripe/PayPal subscription.
        const planId = await planIdOf('athlete-pro')
        await subscriptions.save(aSubscription({ userId: randomUUID(), planId, gatewaySubscriptionId: 'sub_ext_1' }))

        const violated = await violatedConstraint(
            subscriptions.save(aSubscription({ userId: randomUUID(), planId, gatewaySubscriptionId: 'sub_ext_1' })),
        )

        expect(violated).toBe('subscriptions_gateway_subscription_id_unique')
    })

    it('updates the row in place when the same subscription is saved again', async () => {
        const userId = randomUUID()
        const planId = await planIdOf('athlete-pro')
        const subscription = aSubscription({ userId, planId })
        await subscriptions.save(subscription)

        await subscriptions.save(subscription)

        const { rows } = await pool.query('SELECT id FROM subscriptions WHERE user_id = $1', [userId])
        expect(rows).toHaveLength(1)
    })

    it('does not return an expired subscription as live', async () => {
        const userId = randomUUID()
        await subscriptions.save(aSubscription({ userId, planId: await planIdOf('athlete-pro'), status: 'expired' }))

        expect(await subscriptions.findLiveByUser(userId)).toBeNull()
    })
})

describe('Admin billing stats (integration)', () => {
    /** Subscribe a user to a plan on the price of a given interval/currency. */
    async function subscribeOnPrice(input: {
        slug: string
        interval: string
        currency: string
        status?: SubscriptionStatus
    }): Promise<void> {
        await pool.query(
            `INSERT INTO subscriptions (user_id, plan_id, audience, plan_price_id, gateway, status,
                                        current_period_start, current_period_end)
             SELECT gen_random_uuid(), p.id, p.audience, pp.id, 'stripe', $4::subscription_status,
                    now() - interval '1 day', now() + interval '20 days'
             FROM plans p
             JOIN plan_prices pp ON pp.plan_id = p.id AND pp.interval = $2::plan_interval
                                AND pp.currency = $3::currency AND pp.active
             WHERE p.slug = $1`,
            [input.slug, input.interval, input.currency, input.status ?? 'active'],
        )
    }

    it('normalises every interval to a month, so a yearly plan is not twelve times a monthly one', async () => {
        // Seeded prices: athlete-pro is 7,99 €/month and 79,90 €/year.
        await subscribeOnPrice({ slug: 'athlete-pro', interval: 'month', currency: 'EUR' })
        await subscribeOnPrice({ slug: 'athlete-pro', interval: 'year', currency: 'EUR' })

        const { mrr } = await stats.read()
        const eur = mrr.find((row) => row.plan === 'athlete-pro' && row.currency === 'EUR')

        // 799 + 7990/12 ≈ 799 + 666 = 1465 cents a month.
        expect(eur?.amountCents).toBe(799 + Math.round(7990 / 12))
    })

    it('keeps the currencies apart instead of adding cents of different money together', async () => {
        await subscribeOnPrice({ slug: 'athlete-pro', interval: 'month', currency: 'EUR' })
        await subscribeOnPrice({ slug: 'athlete-pro', interval: 'month', currency: 'USD' })

        const { mrr } = await stats.read()

        expect(mrr.find((row) => row.currency === 'EUR')?.amountCents).toBe(799)
        expect(mrr.find((row) => row.currency === 'USD')?.amountCents).toBe(899)
    })

    it('counts a past_due subscriber as revenue in recovery, but a trial as nothing yet', async () => {
        await subscribeOnPrice({ slug: 'coach-pro', interval: 'month', currency: 'EUR', status: 'past_due' })
        await subscribeOnPrice({ slug: 'coach-pro', interval: 'month', currency: 'EUR', status: 'trialing' })

        const snapshot = await stats.read()

        // The trial pays nothing yet; the past_due one is still being billed for.
        expect(snapshot.mrr.find((row) => row.plan === 'coach-pro')?.amountCents).toBe(1999)
        expect(snapshot.trialing).toBe(1)
        expect(snapshot.pastDue).toBe(1)
        // Both still grant their plan, so both are "active" in the entitlement sense.
        expect(snapshot.activeSubscriptions).toBe(2)
    })

    it('adds no revenue for a manual grant — nobody is being charged', async () => {
        const userId = randomUUID()
        await subscriptions.save(aSubscription({ userId, planId: await planIdOf('coach-elite') }))
        await pool.query(`UPDATE subscriptions SET gateway = 'manual' WHERE user_id = $1`, [userId])

        const snapshot = await stats.read()

        expect(snapshot.mrr).toHaveLength(0)
        // It still counts as a subscription, and it still shows which plan it is on.
        expect(snapshot.byStatus).toEqual([{ status: 'active', gateway: 'manual', count: 1 }])
        expect(snapshot.byPlan).toEqual([{ plan: 'coach-elite', audience: 'coach', count: 1 }])
    })

    it('counts churn that is decided but not yet visible: cancelled, still inside the paid period', async () => {
        const userId = randomUUID()
        await subscriptions.save(aSubscription({ userId, planId: await planIdOf('athlete-pro'), status: 'canceled' }))

        const snapshot = await stats.read()

        expect(snapshot.canceling).toBe(1)
        // It has not stopped granting the plan yet — the user paid for this month.
        expect(snapshot.activeSubscriptions).toBe(1)
    })

    it('leaves an expired subscription out of every figure', async () => {
        const userId = randomUUID()
        await subscriptions.save(aSubscription({ userId, planId: await planIdOf('athlete-pro'), status: 'expired' }))

        const snapshot = await stats.read()

        expect(snapshot.activeSubscriptions).toBe(0)
        expect(snapshot.byPlan).toHaveLength(0)
        expect(snapshot.canceling).toBe(0)
    })
})
