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
    await pool.query(
        'TRUNCATE TABLE users, coach_athlete_invitations, coach_athlete, notifications RESTART IDENTITY CASCADE',
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

function usernameFor(email: string): string {
    return email
        .split('@')[0]!
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .padEnd(3, '0')
}

async function register(email: string): Promise<{ access: string; username: string }> {
    const username = usernameFor(email)
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${username}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()
    return { access: cookiePair(setCookies(res), COOKIE.access)!, username }
}

async function eventually<T>(run: () => Promise<T>, predicate: (value: T) => boolean): Promise<T> {
    for (let i = 0; i < 40; i++) {
        const value = await run()
        if (predicate(value)) return value
        await new Promise((r) => setTimeout(r, 25))
    }
    throw new Error('condition not met in time')
}

describe('Coaching via GraphQL', () => {
    it('runs the full invite → accept flow and links coach and athlete', async () => {
        const coach = await register('coach@example.com')
        const athlete = await register('athlete@example.com')

        // Promote to coach; becomeCoach re-issues the session with role=coach.
        const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
        expect(promoted.body.data.becomeCoach.role).toBe('coach')
        const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

        const invited = await gql(
            `mutation { inviteAthlete(username: "${athlete.username}") { id status } }`,
            coachAccess,
        )
        expect(invited.body.errors).toBeUndefined()
        expect(invited.body.data.inviteAthlete.status).toBe('pending')
        const invitationId: string = invited.body.data.inviteAthlete.id

        // Cross-module: the invite drops a notification into the athlete's bell.
        const unread = await eventually(
            async () =>
                (await gql(`query { unreadNotificationsCount }`, athlete.access)).body.data.unreadNotificationsCount,
            (n) => n >= 1,
        )
        expect(unread).toBe(1)

        const pending = await gql(`query { pendingInvitations { id coachUsername } }`, athlete.access)
        expect(pending.body.data.pendingInvitations).toEqual([{ id: invitationId, coachUsername: coach.username }])

        const accepted = await gql(`mutation { acceptInvitation(id: "${invitationId}") { status } }`, athlete.access)
        expect(accepted.body.data.acceptInvitation.status).toBe('accepted')

        const myCoaches = await gql(`query { myCoaches { username } }`, athlete.access)
        expect(myCoaches.body.data.myCoaches).toEqual([{ username: coach.username }])

        const myAthletes = await gql(`query { myAthletes { username } }`, coachAccess)
        expect(myAthletes.body.data.myAthletes).toEqual([{ username: athlete.username }])
    })

    it('forbids a non-coach from inviting', async () => {
        const athlete = await register('plain@example.com')
        const target = await register('target@example.com')

        const res = await gql(`mutation { inviteAthlete(username: "${target.username}") { id } }`, athlete.access)
        expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN')
    })
})
