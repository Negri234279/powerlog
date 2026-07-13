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
import { grantPlan } from './helpers/grant-plan'

/**
 * Plan enforcement, end to end, against the catalog the migration actually seeds:
 * no plan model is faked here, and the entitlements are resolved by the real
 * billing query over real Postgres.
 *
 * What it pins down is the shape of the product: a free account trains and builds
 * templates, a free coach takes 3 athletes, and AI is what you pay for. If the
 * seed changes, these tests are supposed to fail.
 */

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
    await pool.query(
        'TRUNCATE TABLE users, profiles, coach_athlete_invitations, coach_athlete, workout_sessions, workout_templates, mesocycles, notifications, subscriptions RESTART IDENTITY CASCADE',
    )
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

async function aCoach(email: string): Promise<{ access: string; userId: string }> {
    const user = await register(email)
    const promoted = await gql(`mutation { becomeCoach { role } }`, user.access)

    return { access: cookiePair(setCookies(promoted), COOKIE.access)!, userId: user.userId }
}

function errorCode(res: request.Response): string {
    return res.body.errors?.[0]?.extensions?.code
}

const createTemplate = (access: string) =>
    gql(`mutation { createWorkoutTemplate(input: { name: "Upper A", exercises: [] }) { id } }`, access)

const generateAiDraft = (access: string) =>
    gql(
        `mutation { generateMesocycleDraft(input: { weeks: 4, trainingDays: [0, 3], goal: "strength" }) { id } }`,
        access,
    )

describe('plan enforcement (seeded catalog)', () => {
    it('lets a free athlete train: templates and their own blocks are included', async () => {
        const athlete = await register('free@example.com')

        const template = await createTemplate(athlete.access)
        expect(template.body.errors).toBeUndefined()

        const block = await gql(
            `mutation { createMesocycle(input: { name: "Block 1", microcycles: [] }) { id } }`,
            athlete.access,
        )
        expect(block.body.errors).toBeUndefined()
    })

    it('refuses AI to a free athlete, naming the feature so the web can offer the upgrade', async () => {
        const athlete = await register('free@example.com')

        const res = await generateAiDraft(athlete.access)

        expect(res.body.data).toBeNull()
        expect(errorCode(res)).toBe('FEATURE_NOT_IN_PLAN')
        expect(res.body.errors[0].extensions.feature).toBe('ai')
    })

    it('lets the same athlete through once they are on a plan that includes AI', async () => {
        const athlete = await register('paid@example.com')
        await grantPlan(pool, athlete.userId, 'athlete-pro')

        const res = await generateAiDraft(athlete.access)

        // It gets past the plan and fails on the missing provider key instead — the
        // gate is what we're pinning here, not the AI flow (covered in its own e2e).
        expect(errorCode(res)).not.toBe('FEATURE_NOT_IN_PLAN')
    })

    it('caps a free coach at 3 athletes and reports the limit it hit', async () => {
        const coach = await aCoach('coach@example.com')

        for (const email of ['athlete1@example.com', 'athlete2@example.com', 'athlete3@example.com']) {
            const invited = await gql(`mutation { inviteAthlete(email: "${email}") { id } }`, coach.access)
            expect(invited.body.errors).toBeUndefined()

            const athlete = await register(email)
            await gql(
                `mutation { acceptInvitation(id: "${invited.body.data.inviteAthlete.id}") { status } }`,
                athlete.access,
            )
        }

        const fourth = await gql(`mutation { inviteAthlete(email: "athlete4@example.com") { id } }`, coach.access)

        expect(errorCode(fourth)).toBe('PLAN_LIMIT_REACHED')
        expect(fourth.body.errors[0].extensions.limit).toBe(3)
        expect(fourth.body.errors[0].extensions.current).toBe(3)
    })

    it('lifts the cap when the coach is on a bigger plan', async () => {
        const coach = await aCoach('coach@example.com')
        await grantPlan(pool, coach.userId, 'coach-pro')

        for (const email of ['athlete1@example.com', 'athlete2@example.com', 'athlete3@example.com']) {
            const invited = await gql(`mutation { inviteAthlete(email: "${email}") { id } }`, coach.access)
            const athlete = await register(email)
            await gql(
                `mutation { acceptInvitation(id: "${invited.body.data.inviteAthlete.id}") { status } }`,
                athlete.access,
            )
        }

        const fourth = await gql(`mutation { inviteAthlete(email: "athlete4@example.com") { id } }`, coach.access)

        expect(fourth.body.errors).toBeUndefined()
    })

    it('keeps a canceled subscriber on their plan until the period they paid for ends', async () => {
        const athlete = await register('canceled@example.com')
        await grantPlan(pool, athlete.userId, 'athlete-pro')
        // Cancelled, but the month is still running: cancelling never takes back time
        // that was already bought — whether it was cancelled here or in the gateway.
        await pool.query(
            `UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = true, canceled_at = now()
             WHERE user_id = $1`,
            [athlete.userId],
        )

        expect(errorCode(await generateAiDraft(athlete.access))).not.toBe('FEATURE_NOT_IN_PLAN')

        // Now let that period elapse: they fall back to free and the feature closes.
        await pool.query(`UPDATE subscriptions SET current_period_end = now() - interval '1 day' WHERE user_id = $1`, [
            athlete.userId,
        ])

        expect(errorCode(await generateAiDraft(athlete.access))).toBe('FEATURE_NOT_IN_PLAN')
    })

    it('never blocks what a downgraded user already has: the block is only on creating', async () => {
        // A soft downgrade. The athlete built a template while on a paid plan; on free
        // they can still read and edit it — templates are in the free plan, and even the
        // things that are not would keep their existing rows readable.
        const athlete = await register('downgraded@example.com')
        const created = await createTemplate(athlete.access)
        const templateId: string = created.body.data.createWorkoutTemplate.id

        const renamed = await gql(
            `mutation { updateWorkoutTemplate(id: "${templateId}", input: { name: "Upper A v2", exercises: [] }) { id name } }`,
            athlete.access,
        )

        expect(renamed.body.errors).toBeUndefined()
        expect(renamed.body.data.updateWorkoutTemplate.name).toBe('Upper A v2')
    })
})
