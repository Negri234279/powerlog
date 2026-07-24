import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import cookieParser from 'cookie-parser'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { PG_POOL } from '../src/database/database.module'
import * as schema from '../src/database/schema'
import { Mailer } from '../src/mail/mailer.port'
import { FakeMailer } from '../tests/doubles/shared'

/**
 * The admin catalog, over GraphQL, against the real seeded plans.
 *
 * The point of these tests is that the panel is not a separate world: a plan an
 * admin creates here is the same object the entitlement checks read, so granting
 * it to a user has to unlock the feature for them — end to end, no fakes.
 */

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>

const COOKIE = { access: 'pl_at' }

// The launch catalog (0055): three active tiers per audience, plus the pre-launch
// plans it renamed `-legacy` and archived. beforeEach keeps all of them.
const SEEDED = [
    'athlete-free',
    'athlete-pro',
    'athlete-elite',
    'coach-free',
    'coach-pro',
    'coach-elite',
    'athlete-free-legacy',
    'athlete-pro-legacy',
    'coach-free-legacy',
    'coach-pro-legacy',
    'coach-elite-legacy',
]

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    const testPool = new Pool({ connectionString: container.getConnectionUri() })
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PG_POOL)
        .useValue(testPool)
        .overrideProvider(Mailer)
        .useValue(new FakeMailer())
        .compile()

    app = moduleRef.createNestApplication({ bufferLogs: true })
    app.use(cookieParser())
    await app.init()

    pool = app.get<Pool>(PG_POOL)
    await migrate(drizzle(pool, { schema }), { migrationsFolder: './drizzle' })
    httpServer = app.getHttpServer()
}, 180_000)

afterAll(async () => {
    await app?.close()
    await container?.stop()
})

beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users, profiles, subscriptions RESTART IDENTITY CASCADE')
    // Plans a test created; the seeded catalog stays (it is what free users read).
    await pool.query(`DELETE FROM plans WHERE slug <> ALL($1::text[])`, [SEEDED])
})

// ── helpers ───────────────────────────────────────────────────────────
function setCookies(res: request.Response): string[] {
    const raw = res.headers['set-cookie']
    return Array.isArray(raw) ? raw : raw ? [raw] : []
}

function cookiePair(cookies: string[], name: string): string | undefined {
    return cookies.find((c) => c.startsWith(`${name}=`))?.split(';')[0]
}

function gql(query: string, cookie?: string) {
    const req = request(httpServer).post('/graphql').send({ query })
    return cookie ? req.set('Cookie', cookie) : req
}

async function register(email: string): Promise<{ access: string; userId: string }> {
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${email.split('@')[0]}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()

    return { access: cookiePair(setCookies(res), COOKIE.access)!, userId: res.body.data.register.id }
}

/** An admin: the flag is set in the DB, then the session is re-issued so the JWT carries it. */
async function anAdmin(email = 'admin@example.com'): Promise<{ access: string; userId: string }> {
    const user = await register(email)
    await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [user.userId])

    const login = await gql(`mutation { login(input: { email: "${email}", password: "supersecret" }) { id } }`)

    return { access: cookiePair(setCookies(login), COOKIE.access)!, userId: user.userId }
}

function errorCode(res: request.Response): string {
    return res.body.errors?.[0]?.extensions?.code
}

const PLAN_FIELDS =
    'id slug status isFree entitlements snapshot { ai maxAthletes } prices { id interval currency amountCents active }'

describe('admin billing (GraphQL)', () => {
    it('is admin-only — an ordinary user cannot even read the catalog', async () => {
        const user = await register('nobody@example.com')

        const res = await gql(`query { adminPlans { id slug } }`, user.access)

        expect(errorCode(res)).toBe('FORBIDDEN')
    })

    it('lists the seeded catalog with its prices and what each plan actually grants', async () => {
        const admin = await anAdmin()

        const res = await gql(`query { adminPlans(audience: "athlete") { ${PLAN_FIELDS} } }`, admin.access)

        const plans = res.body.data.adminPlans
        // The live launch catalog is the three active athlete tiers; the pre-launch
        // plans are still listed, archived (0055 renamed them `-legacy`).
        const active = plans.filter((plan: { status: string }) => plan.status === 'active')
        expect(active.map((plan: { slug: string }) => plan.slug)).toEqual([
            'athlete-free',
            'athlete-pro',
            'athlete-elite',
        ])
        expect(
            plans.some(
                (plan: { slug: string; status: string }) =>
                    plan.slug === 'athlete-pro-legacy' && plan.status === 'archived',
            ),
        ).toBe(true)

        const free = plans.find((plan: { slug: string }) => plan.slug === 'athlete-free')
        expect(free.isFree).toBe(true)
        expect(free.snapshot.ai).toBe(false)
        // The raw jsonb the form edits comes back as JSON, not as a typed shape.
        expect(free.entitlements).toEqual({ maxTemplates: 3, maxMesocycles: 1, maxWorkouts: 30, ai: false })

        const pro = plans.find((plan: { slug: string }) => plan.slug === 'athlete-pro')
        expect(pro.prices).toHaveLength(4) // month/year × EUR/USD
        expect(pro.prices.every((price: { active: boolean }) => price.active)).toBe(true)
    })

    it('describes the entitlements an audience accepts, so the form can build itself', async () => {
        const admin = await anAdmin()

        const res = await gql(`query { adminPlanEntitlementsSchema(audience: "coach") }`, admin.access)

        const jsonSchema = res.body.data.adminPlanEntitlementsSchema
        // A feature added to the zod schema shows up here — and therefore in the form —
        // with no UI change and no migration. The coach shape is flat now: coaching
        // only, no nested athlete section (that moved to its own plan).
        expect(Object.keys(jsonSchema.properties)).toEqual([
            'maxAthletes',
            'planSessions',
            'maxTemplates',
            'maxMesocycles',
            'ai',
        ])
    })

    it('creates a plan as a draft, and a draft cannot be granted to anyone', async () => {
        const admin = await anAdmin()
        const user = await register('someone@example.com')

        const created = await gql(
            `mutation { createPlan(input: {
                audience: "athlete", slug: "athlete-trial", name: "Trial",
                entitlements: { maxTemplates: null, maxMesocycles: null, maxWorkouts: null, ai: true }
            }) }`,
            admin.access,
        )
        const planId = created.body.data.createPlan

        const granted = await gql(
            `mutation { adminAssignSubscription(input: { userId: "${user.userId}", planId: "${planId}" }) }`,
            admin.access,
        )

        expect(errorCode(granted)).toBe('PLAN_NOT_AVAILABLE')
    })

    it('rejects entitlements that do not fit the audience', async () => {
        const admin = await anAdmin()

        const res = await gql(
            `mutation { createPlan(input: {
                audience: "athlete", slug: "athlete-bad", name: "Bad",
                entitlements: { maxAthletes: 3, planSessions: true }
            }) }`,
            admin.access,
        )

        expect(errorCode(res)).toBe('INVALID_PLAN_ENTITLEMENTS')
    })

    it('grants a plan by hand and the user gets the feature — the panel is not a separate world', async () => {
        const admin = await anAdmin()
        const user = await register('comped@example.com')

        // Free: no AI.
        const before = await gql(
            `mutation { generateMesocycleDraft(input: { weeks: 4, trainingDays: [0, 3] }) { id } }`,
            user.access,
        )
        expect(errorCode(before)).toBe('FEATURE_NOT_IN_PLAN')

        const plans = await gql(`query { adminPlans(audience: "athlete") { id slug } }`, admin.access)
        const pro = plans.body.data.adminPlans.find((plan: { slug: string }) => plan.slug === 'athlete-pro')
        const granted = await gql(
            `mutation { adminAssignSubscription(input: { userId: "${user.userId}", planId: "${pro.id}" }) }`,
            admin.access,
        )
        expect(granted.body.errors).toBeUndefined()

        const after = await gql(
            `mutation { generateMesocycleDraft(input: { weeks: 4, trainingDays: [0, 3] }) { id } }`,
            user.access,
        )
        // Past the plan gate now; it stops at the missing provider key instead.
        expect(errorCode(after)).not.toBe('FEATURE_NOT_IN_PLAN')

        // And the grant is visible in the panel, with no charge attached.
        const list = await gql(
            `query { adminSubscriptions(search: "comped@example.com") { total rows { gateway status planSlug amountCents email } } }`,
            admin.access,
        )
        expect(list.body.data.adminSubscriptions.total).toBe(1)
        expect(list.body.data.adminSubscriptions.rows[0]).toMatchObject({
            gateway: 'manual',
            status: 'active',
            planSlug: 'athlete-pro',
            amountCents: null,
            email: 'comped@example.com',
        })
    })

    it('revoking a grant closes the feature again', async () => {
        const admin = await anAdmin()
        const user = await register('revoked@example.com')
        const plans = await gql(`query { adminPlans(audience: "athlete") { id slug } }`, admin.access)
        const pro = plans.body.data.adminPlans.find((plan: { slug: string }) => plan.slug === 'athlete-pro')

        const subscriptionId = (
            await gql(
                `mutation { adminAssignSubscription(input: { userId: "${user.userId}", planId: "${pro.id}" }) }`,
                admin.access,
            )
        ).body.data.adminAssignSubscription

        const revoked = await gql(`mutation { adminRevokeSubscription(id: "${subscriptionId}") }`, admin.access)
        expect(revoked.body.errors).toBeUndefined()

        const after = await gql(
            `mutation { generateMesocycleDraft(input: { weeks: 4, trainingDays: [0, 3] }) { id } }`,
            user.access,
        )
        expect(errorCode(after)).toBe('FEATURE_NOT_IN_PLAN')
    })

    it('editing a plan reaches its subscribers at once — entitlements are read live', async () => {
        const admin = await anAdmin()
        const user = await register('subscriber@example.com')
        const plans = await gql(`query { adminPlans(audience: "athlete") { id slug } }`, admin.access)
        const pro = plans.body.data.adminPlans.find((plan: { slug: string }) => plan.slug === 'athlete-pro')
        await gql(
            `mutation { adminAssignSubscription(input: { userId: "${user.userId}", planId: "${pro.id}" }) }`,
            admin.access,
        )

        // Take AI out of the plan they are ON.
        const updated = await gql(
            `mutation { updatePlan(input: { id: "${pro.id}", entitlements: { maxTemplates: null, maxMesocycles: null, maxWorkouts: null, ai: false } }) }`,
            admin.access,
        )
        expect(updated.body.errors).toBeUndefined()

        const after = await gql(
            `mutation { generateMesocycleDraft(input: { weeks: 4, trainingDays: [0, 3] }) { id } }`,
            user.access,
        )
        expect(errorCode(after)).toBe('FEATURE_NOT_IN_PLAN')
    })

    it('repricing withdraws the version on sale and keeps it in the history', async () => {
        const admin = await anAdmin()
        const plans = await gql(`query { adminPlans(audience: "athlete") { id slug } }`, admin.access)
        const pro = plans.body.data.adminPlans.find((plan: { slug: string }) => plan.slug === 'athlete-pro')

        await gql(
            `mutation { addPlanPrice(input: { planId: "${pro.id}", interval: "month", currency: "EUR", amountCents: 999 }) }`,
            admin.access,
        )

        const res = await gql(
            `query { adminPlans(audience: "athlete") { slug ${'prices { interval currency amountCents active }'} } }`,
            admin.access,
        )
        const prices = res.body.data.adminPlans.find((plan: { slug: string }) => plan.slug === 'athlete-pro').prices
        const eurMonth = prices.filter(
            (price: { interval: string; currency: string }) => price.interval === 'month' && price.currency === 'EUR',
        )

        // Both versions are there; exactly one is on sale, and it is the new one.
        expect(eurMonth).toHaveLength(2)
        expect(eurMonth.filter((price: { active: boolean }) => price.active)).toEqual([
            { interval: 'month', currency: 'EUR', amountCents: 999, active: true },
        ])
        expect(eurMonth.find((price: { active: boolean }) => !price.active).amountCents).toBe(499)
    })

    it("refuses to archive the audience's only free plan", async () => {
        const admin = await anAdmin()
        const plans = await gql(`query { adminPlans(audience: "athlete") { id slug isFree } }`, admin.access)
        const free = plans.body.data.adminPlans.find((plan: { isFree: boolean }) => plan.isFree)

        const res = await gql(`mutation { setPlanStatus(id: "${free.id}", status: "archived") }`, admin.access)

        expect(errorCode(res)).toBe('LAST_FREE_PLAN')
    })

    it('reports the figures the dashboard shows', async () => {
        const admin = await anAdmin()
        const user = await register('paying@example.com')
        const plans = await gql(`query { adminPlans(audience: "athlete") { id slug } }`, admin.access)
        const pro = plans.body.data.adminPlans.find((plan: { slug: string }) => plan.slug === 'athlete-pro')
        await gql(
            `mutation { adminAssignSubscription(input: { userId: "${user.userId}", planId: "${pro.id}" }) }`,
            admin.access,
        )

        const res = await gql(
            `query { adminBillingStats { activeSubscriptions trialing pastDue canceling byPlan { plan count } mrr { plan amountCents } } }`,
            admin.access,
        )

        const stats = res.body.data.adminBillingStats
        expect(stats.activeSubscriptions).toBe(1)
        expect(stats.byPlan).toEqual([{ plan: 'athlete-pro', count: 1 }])
        // A comp brings in no revenue — it has no price.
        expect(stats.mrr).toEqual([])
        expect(stats.canceling).toBe(0)
    })
})
