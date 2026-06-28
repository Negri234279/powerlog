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
