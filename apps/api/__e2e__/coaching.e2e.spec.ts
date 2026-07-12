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
let mailer: FakeMailer

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
    mailer = app.get<FakeMailer>(Mailer)
}, 180_000)

afterAll(async () => {
    await app?.close()
    await container?.stop()
})

beforeEach(async () => {
    await pool.query(
        'TRUNCATE TABLE users, profiles, coach_athlete_invitations, coach_athlete, coach_athlete_notes, notifications RESTART IDENTITY CASCADE',
    )
    mailer.sent.length = 0
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

async function register(email: string): Promise<{ access: string; username: string; userId: string }> {
    const username = usernameFor(email)
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${username}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()
    return {
        access: cookiePair(setCookies(res), COOKIE.access)!,
        username,
        userId: res.body.data.register.id,
    }
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

        const invited = await gql(`mutation { inviteAthlete(email: "athlete@example.com") { id status } }`, coachAccess)
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
        await register('target@example.com')

        const res = await gql(`mutation { inviteAthlete(email: "target@example.com") { id } }`, athlete.access)
        expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN')
    })

    it('auto-links a not-yet-registered invitee when they sign up, notifying both', async () => {
        const coach = await register('coach@example.com')
        const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
        const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

        // Invite an email that has no account yet → pending, nobody belled.
        const invited = await gql(`mutation { inviteAthlete(email: "newbie@example.com") { status } }`, coachAccess)
        expect(invited.body.data.inviteAthlete.status).toBe('pending')

        // The invitee signs up with that email → auto-linked, no accept needed.
        const athlete = await register('newbie@example.com')

        const myAthletes = await eventually(
            async () => (await gql(`query { myAthletes { username } }`, coachAccess)).body.data.myAthletes,
            (list: unknown[]) => list.length >= 1,
        )
        expect(myAthletes).toEqual([{ username: athlete.username }])

        // Both parties get a link notification.
        const coachUnread = await eventually(
            async () =>
                (await gql(`query { unreadNotificationsCount }`, coachAccess)).body.data.unreadNotificationsCount,
            (n: number) => n >= 1,
        )
        expect(coachUnread).toBe(1)

        const athleteBell = await gql(`query { myNotifications(limit: 5) { items { type } } }`, athlete.access)
        const types = athleteBell.body.data.myNotifications.items.map((i: { type: string }) => i.type)
        expect(types).toContain('coach_linked')
    })

    it('lets a coach keep a private note on a linked athlete and clear it', async () => {
        const coach = await register('coach@example.com')
        const athlete = await register('athlete@example.com')
        const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
        const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

        const invited = await gql(`mutation { inviteAthlete(email: "athlete@example.com") { id } }`, coachAccess)
        await gql(
            `mutation { acceptInvitation(id: "${invited.body.data.inviteAthlete.id}") { status } }`,
            athlete.access,
        )

        const setRes = await gql(
            `mutation { setAthleteNote(athleteId: "${athlete.userId}", body: "  strong squats  ") }`,
            coachAccess,
        )
        expect(setRes.body.data.setAthleteNote).toBe(true)

        const note = await gql(`query { athleteNote(athleteId: "${athlete.userId}") { body } }`, coachAccess)
        expect(note.body.data.athleteNote.body).toBe('strong squats')

        // Empty body clears it.
        await gql(`mutation { setAthleteNote(athleteId: "${athlete.userId}", body: "") }`, coachAccess)
        const cleared = await gql(`query { athleteNote(athleteId: "${athlete.userId}") { body } }`, coachAccess)
        expect(cleared.body.data.athleteNote).toBeNull()
    })

    it('rejects noting someone who is not your athlete', async () => {
        const coach = await register('coach@example.com')
        const stranger = await register('stranger@example.com')
        const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
        const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

        const res = await gql(`mutation { setAthleteNote(athleteId: "${stranger.userId}", body: "nope") }`, coachAccess)
        expect(res.body.errors[0].extensions.code).toBe('NOT_YOUR_ATHLETE')
    })

    it('exposes a public invitation preview from the signup-link token', async () => {
        const coach = await register('coach@example.com')
        const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
        const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

        await gql(`mutation { inviteAthlete(email: "newbie@example.com") { id } }`, coachAccess)

        // The email-only invite mails a signup link carrying the opaque token.
        const text = await eventually(
            async () => mailer.sent.at(-1)?.text ?? '',
            (t: string) => t.includes('/register?invite='),
        )
        const token = decodeURIComponent(text.split('/register?invite=')[1]!.split(/\s/)[0]!.trim())

        const preview = await gql(
            `query { coachInvitationPreview(token: "${token}") { email coachUsername suggestedUsername } }`,
        )
        expect(preview.body.data.coachInvitationPreview).toEqual({
            email: 'newbie@example.com',
            coachUsername: coach.username,
            suggestedUsername: 'newbie',
        })

        // An unknown token reveals nothing (public — must not leak existence).
        const missing = await gql(`query { coachInvitationPreview(token: "nope") { email } }`)
        expect(missing.body.data.coachInvitationPreview).toBeNull()
    })
})
