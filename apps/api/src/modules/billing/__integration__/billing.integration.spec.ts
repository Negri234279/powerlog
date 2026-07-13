import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { SubscriptionAggregate } from '../domain/entities/subscription.entity'
import type { SubscriptionStatus } from '../domain/subscription-status'
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

const PERIOD_START = new Date('2026-07-01T00:00:00.000Z')
const PERIOD_END = new Date('2026-08-01T00:00:00.000Z')

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    plans = new DrizzlePlanRepository(db)
    subscriptions = new DrizzleSubscriptionRepository(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    // The catalog is seeded by migration and is NOT truncated: it is what every
    // user without a subscription resolves to.
    await db.execute(sql`TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE`)
})

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
    status?: SubscriptionStatus
    gatewaySubscriptionId?: string
}): SubscriptionAggregate {
    return SubscriptionAggregate.create({
        id: randomUUID(),
        userId: input.userId,
        planId: input.planId,
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
        expect(athleteFree?.entitlements.toSnapshot('athlete-free').ai).toBe(false)
        expect(coachFree?.entitlements.toSnapshot('coach-free').maxAthletes).toBe(3)
    })

    it('rehydrates the jsonb entitlements through the zod schema of the plan audience', async () => {
        const coachPro = await plans.findById(await planIdOf('coach-pro'))
        const snapshot = coachPro!.entitlements.toSnapshot('coach-pro')

        // The coach's own training features come from the plan's nested athlete
        // section — the collapse happens on real data, not just in unit tests.
        expect(snapshot).toMatchObject({ audience: 'coach', ai: true, planSessions: true, maxAthletes: 20 })
    })

    it('refuses a second active free plan for the same audience', async () => {
        await expect(
            pool.query(
                `INSERT INTO plans (audience, slug, name, status, is_free, entitlements)
                 VALUES ('athlete', 'athlete-free-2', 'Free 2', 'active', true,
                         '{"templates": true, "mesocycles": true, "ai": false}'::jsonb)`,
            ),
        ).rejects.toThrow(/plans_one_active_free_per_audience/)
    })

    it('allows an archived free plan alongside the active one (the history stays)', async () => {
        await expect(
            pool.query(
                `INSERT INTO plans (audience, slug, name, status, is_free, entitlements)
                 VALUES ('athlete', 'athlete-free-old', 'Free (old)', 'archived', true,
                         '{"templates": true, "mesocycles": false, "ai": false}'::jsonb)`,
            ),
        ).resolves.toBeDefined()
    })

    it('keeps only one active price per (plan, interval, currency)', async () => {
        const planId = await planIdOf('athlete-pro')

        await expect(
            pool.query(
                `INSERT INTO plan_prices (plan_id, interval, currency, amount_cents)
                 VALUES ($1, 'month', 'EUR', 999)`,
                [planId],
            ),
        ).rejects.toThrow(/plan_prices_one_active_per_combo/)
    })

    it('lets a new price version replace a deactivated one', async () => {
        // How a price change is done: never an UPDATE — deactivate and insert, so the
        // subscriptions signed on the old version keep pointing at it.
        const planId = await planIdOf('athlete-pro')
        await pool.query(
            `UPDATE plan_prices SET active = false WHERE plan_id = $1 AND interval = 'month' AND currency = 'EUR'`,
            [planId],
        )

        await expect(
            pool.query(
                `INSERT INTO plan_prices (plan_id, interval, currency, amount_cents)
                 VALUES ($1, 'month', 'EUR', 999)`,
                [planId],
            ),
        ).resolves.toBeDefined()
    })
})

describe('Subscriptions (integration)', () => {
    it('allows only one live subscription per user', async () => {
        const userId = randomUUID()
        const planId = await planIdOf('athlete-pro')
        await subscriptions.save(aSubscription({ userId, planId }))

        const violated = await violatedConstraint(subscriptions.save(aSubscription({ userId, planId })))

        expect(violated).toBe('subscriptions_one_live_per_user')
    })

    it('still counts a canceled subscription as live, so nobody stacks one on paid time', async () => {
        const userId = randomUUID()
        const planId = await planIdOf('athlete-pro')
        await subscriptions.save(aSubscription({ userId, planId, status: 'canceled' }))

        const violated = await violatedConstraint(subscriptions.save(aSubscription({ userId, planId })))

        expect(violated).toBe('subscriptions_one_live_per_user')
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
