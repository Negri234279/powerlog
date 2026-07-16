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

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>

const COOKIE = { access: 'pl_at' }

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
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
    await pool.query('TRUNCATE TABLE workout_sessions RESTART IDENTITY CASCADE')
    // `user_id` is a soft reference, so CASCADE from users doesn't reach these.
    await pool.query('TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE')
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

function usernameFor(email: string): string {
    return email
        .split('@')[0]!
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .padEnd(3, '0')
        .slice(0, 30)
}

async function registerUser(email: string): Promise<string> {
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${usernameFor(email)}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()
    return cookiePair(setCookies(res), COOKIE.access)!
}

async function registerAdmin(email: string): Promise<string> {
    await registerUser(email)
    await pool.query('UPDATE users SET is_admin = true WHERE email = $1', [email])
    const res = await gql(`mutation { login(input: { email: "${email}", password: "supersecret" }) { id } }`)
    expect(res.body.errors).toBeUndefined()
    return cookiePair(setCookies(res), COOKIE.access)!
}

/**
 * The user's id straight from the DB. Deliberately not `adminUserIdByEmail`: that
 * one lists users, which resolves their plan and warms the entitlements cache —
 * so a subscription created afterwards would show up under the plan they had a
 * moment ago (the cache is invalidated by an event a raw INSERT doesn't publish).
 */
async function userIdByEmail(email: string): Promise<string> {
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email])

    return rows[0]!.id
}

/** Put a user on a paid plan of the seeded catalog, the way a gateway would. */
async function subscribeTo(userId: string, planSlug: string): Promise<void> {
    await pool.query(
        `INSERT INTO subscriptions (user_id, plan_id, gateway, status, current_period_start, current_period_end)
         SELECT $1, p.id, 'manual', 'active', now(), now() + interval '30 days'
         FROM plans p WHERE p.slug = $2`,
        [userId, planSlug],
    )
}

async function adminUserIdByEmail(admin: string, email: string): Promise<string> {
    const res = await gql(`query { adminUsers(search: "${email}") { rows { id email } } }`, admin)
    expect(res.body.errors).toBeUndefined()
    return res.body.data.adminUsers.rows.find((r: { email: string }) => r.email === email).id
}

describe('Admin users + stats via GraphQL', () => {
    it('forbids non-admins from listing users or changing roles', async () => {
        const access = await registerUser('plain@example.com')

        const list = await gql(`query { adminUsers { total } }`, access)
        expect(list.body.errors[0].extensions.code).toBe('FORBIDDEN')

        const stats = await gql(`query { adminUserStats { total } }`, access)
        expect(stats.body.errors[0].extensions.code).toBe('FORBIDDEN')
    })

    it('lists users with filters and reports aggregate stats', async () => {
        const admin = await registerAdmin('admin@example.com')
        await registerUser('athlete@example.com')

        const list = await gql(
            `query { adminUsers(limit: 10) { rows { email username role isAdmin emailVerified } total limit offset } }`,
            admin,
        )
        expect(list.body.errors).toBeUndefined()
        expect(list.body.data.adminUsers.total).toBeGreaterThanOrEqual(2)
        expect(list.body.data.adminUsers.limit).toBe(10)
        const adminRow = list.body.data.adminUsers.rows.find((r: { email: string }) => r.email === 'admin@example.com')
        expect(adminRow).toMatchObject({ isAdmin: true, username: 'admin' })

        const stats = await gql(
            `query { adminUserStats { total athletes coaches admins verified active disabled newLast7Days newLast30Days } }`,
            admin,
        )
        expect(stats.body.errors).toBeUndefined()
        expect(stats.body.data.adminUserStats.total).toBeGreaterThanOrEqual(2)
        expect(stats.body.data.adminUserStats.admins).toBeGreaterThanOrEqual(1)
        expect(stats.body.data.adminUserStats.newLast7Days).toBeGreaterThanOrEqual(2)
    })

    it('filters by the plan in force, free plans included', async () => {
        const admin = await registerAdmin('admin-plans@example.com')
        await registerUser('payer@example.com')
        await registerUser('freeloader@example.com')
        await subscribeTo(await userIdByEmail('payer@example.com'), 'athlete-pro')

        const paid = await gql(`query { adminUsers(plans: ["athlete-pro"]) { rows { email plan } total } }`, admin)
        expect(paid.body.errors).toBeUndefined()
        expect(paid.body.data.adminUsers.rows).toEqual([{ email: 'payer@example.com', plan: 'athlete-pro' }])
        // `total` counts the filtered listing, not the page — it drives the infinite
        // scroll, so a plan filter that only trimmed the page would loop forever.
        expect(paid.body.data.adminUsers.total).toBe(1)

        // The free plan is nobody's subscription: it's whoever falls back to it. The
        // subscriber must not appear here even though he is an athlete.
        const free = await gql(`query { adminUsers(plans: ["athlete-free"]) { rows { email plan } } }`, admin)
        const emails = free.body.data.adminUsers.rows.map((row: { email: string }) => row.email)
        expect(emails).toContain('freeloader@example.com')
        expect(emails).toContain('admin-plans@example.com')
        expect(emails).not.toContain('payer@example.com')
    })

    it('lists nobody for a plan nobody is on, rather than everybody', async () => {
        const admin = await registerAdmin('admin-empty-plan@example.com')

        // The failure this guards is a filter that collapses to "no filter": an empty
        // membership must read as no rows, not as the whole table.
        const res = await gql(`query { adminUsers(plans: ["coach-elite"]) { rows { email } total } }`, admin)

        expect(res.body.errors).toBeUndefined()
        expect(res.body.data.adminUsers).toEqual({ rows: [], total: 0 })
    })

    it('keeps a canceled-but-unexpired subscriber on their plan, and drops them once it lapses', async () => {
        const admin = await registerAdmin('admin-canceled@example.com')
        await registerUser('leaving@example.com')
        const userId = await userIdByEmail('leaving@example.com')
        await subscribeTo(userId, 'athlete-pro')

        // Canceled but paid up: still on the plan they paid for.
        await pool.query(
            `UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = true, canceled_at = now()
             WHERE user_id = $1`,
            [userId],
        )
        const during = await gql(`query { adminUsers(plans: ["athlete-pro"]) { rows { email } } }`, admin)
        expect(during.body.data.adminUsers.rows).toEqual([{ email: 'leaving@example.com' }])

        // Period elapsed: the fallback takes over, and they show up under free.
        await pool.query(`UPDATE subscriptions SET current_period_end = now() - interval '1 day' WHERE user_id = $1`, [
            userId,
        ])
        const after = await gql(`query { adminUsers(plans: ["athlete-pro"]) { rows { email } } }`, admin)
        expect(after.body.data.adminUsers.rows).toEqual([])

        const free = await gql(`query { adminUsers(plans: ["athlete-free"]) { rows { email } } }`, admin)
        const emails = free.body.data.adminUsers.rows.map((row: { email: string }) => row.email)
        expect(emails).toContain('leaving@example.com')
    })

    it('changes a user’s role and admin flag', async () => {
        const admin = await registerAdmin('admin2@example.com')
        await registerUser('promote@example.com')
        const targetId = await adminUserIdByEmail(admin, 'promote@example.com')

        const roled = await gql(
            `mutation { setUserRole(input: { userId: "${targetId}", role: "coach" }) { id role } }`,
            admin,
        )
        expect(roled.body.data.setUserRole).toMatchObject({ id: targetId, role: 'coach' })

        const adminned = await gql(
            `mutation { setUserAdmin(input: { userId: "${targetId}", isAdmin: true }) { id isAdmin } }`,
            admin,
        )
        expect(adminned.body.data.setUserAdmin).toMatchObject({ id: targetId, isAdmin: true })

        // Persisted: a fresh read reflects both changes (regression — `save` must
        // write role + is_admin, not just return the in-memory aggregate).
        const reread = await gql(
            `query { adminUsers(search: "promote@example.com") { rows { id role isAdmin } } }`,
            admin,
        )
        const row = reread.body.data.adminUsers.rows.find((r: { id: string }) => r.id === targetId)
        expect(row).toMatchObject({ role: 'coach', isAdmin: true })
    })

    it('refuses to let an admin revoke their own admin access', async () => {
        const admin = await registerAdmin('selfadmin@example.com')
        const selfId = await adminUserIdByEmail(admin, 'selfadmin@example.com')

        const res = await gql(
            `mutation { setUserAdmin(input: { userId: "${selfId}", isAdmin: false }) { id isAdmin } }`,
            admin,
        )
        expect(res.body.errors[0].extensions.code).toBe('CANNOT_REVOKE_OWN_ADMIN')
    })

    it('disables a user (signing them out) and re-enables them', async () => {
        const admin = await registerAdmin('statusadmin@example.com')
        const reg = await gql(
            `mutation { register(input: { email: "target-status@example.com", username: "${usernameFor('target-status@example.com')}", password: "supersecret" }) { id } }`,
        )
        const targetRefresh = cookiePair(setCookies(reg), 'pl_rt')!
        const targetId = await adminUserIdByEmail(admin, 'target-status@example.com')

        const disabled = await gql(
            `mutation { setUserStatus(input: { userId: "${targetId}", disabled: true }) { id status } }`,
            admin,
        )
        expect(disabled.body.data.setUserStatus).toMatchObject({ id: targetId, status: 'disabled' })

        // Persisted, and disabling revoked their sessions → refresh now fails.
        const reread = await gql(
            `query { adminUsers(search: "target-status@example.com") { rows { id status } } }`,
            admin,
        )
        expect(reread.body.data.adminUsers.rows.find((r: { id: string }) => r.id === targetId).status).toBe('disabled')

        const refreshed = await gql(`mutation { refresh { id } }`, targetRefresh)
        expect(refreshed.body.errors[0].extensions.code).toBe('INVALID_REFRESH_TOKEN')

        const enabled = await gql(
            `mutation { setUserStatus(input: { userId: "${targetId}", disabled: false }) { id status } }`,
            admin,
        )
        expect(enabled.body.data.setUserStatus).toMatchObject({ id: targetId, status: 'active' })
    })

    it('refuses to let an admin disable their own account', async () => {
        const admin = await registerAdmin('selfdisable@example.com')
        const selfId = await adminUserIdByEmail(admin, 'selfdisable@example.com')

        const res = await gql(
            `mutation { setUserStatus(input: { userId: "${selfId}", disabled: true }) { id } }`,
            admin,
        )
        expect(res.body.errors[0].extensions.code).toBe('CANNOT_DISABLE_SELF')
    })

    it('exposes coaching and workout aggregate stats', async () => {
        const admin = await registerAdmin('admin3@example.com')

        const coaching = await gql(
            `query { adminCoachingStats { links activeCoaches linkedAthletes pendingInvitations } }`,
            admin,
        )
        expect(coaching.body.errors).toBeUndefined()
        expect(coaching.body.data.adminCoachingStats).toMatchObject({ links: 0, pendingInvitations: 0 })

        const workouts = await gql(
            `query { adminWorkoutStats { sessions completedSessions sets exercises sessionsLast7Days activeUsers } }`,
            admin,
        )
        expect(workouts.body.errors).toBeUndefined()
        expect(workouts.body.data.adminWorkoutStats.exercises).toBeGreaterThanOrEqual(40)
        expect(workouts.body.data.adminWorkoutStats.sessions).toBe(0)
    })
})
