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
        'TRUNCATE TABLE users, coach_athlete_invitations, coach_athlete, workout_sessions, notifications RESTART IDENTITY CASCADE',
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

async function register(email: string): Promise<{ access: string; userId: string; username: string }> {
    const username = usernameFor(email)
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${username}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()
    return { access: cookiePair(setCookies(res), COOKIE.access)!, userId: res.body.data.register.id, username }
}

async function anExerciseId(access: string): Promise<string> {
    const res = await gql(`query { exercises { id } }`, access)
    return res.body.data.exercises[0].id
}

/** Register coach + athlete, promote, link them via invite/accept. */
async function linkedCoachAndAthlete(): Promise<{
    coachAccess: string
    coachId: string
    athlete: { access: string; userId: string; username: string }
}> {
    const coach = await register('coach@example.com')
    const athlete = await register('athlete@example.com')

    const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
    const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

    const invited = await gql(`mutation { inviteAthlete(email: "athlete@example.com") { id } }`, coachAccess)
    const invitationId: string = invited.body.data.inviteAthlete.id
    await gql(`mutation { acceptInvitation(id: "${invitationId}") { status } }`, athlete.access)

    return { coachAccess, coachId: coach.userId, athlete }
}

describe('Coach planning via GraphQL', () => {
    it('lets a coach plan a session for a linked athlete, who then logs the real sets', async () => {
        const { coachAccess, coachId, athlete } = await linkedCoachAndAthlete()

        const planned = await gql(
            `mutation { planWorkoutSession(input: { athleteId: "${athlete.userId}", notes: "week 1 squats" }) { id userId plannedByUserId status } }`,
            coachAccess,
        )
        expect(planned.body.errors).toBeUndefined()
        expect(planned.body.data.planWorkoutSession).toMatchObject({
            userId: athlete.userId,
            plannedByUserId: coachId,
            status: 'planned',
        })
        const sessionId: string = planned.body.data.planWorkoutSession.id

        // Coach builds the plan: an exercise with a programmed (planned) set.
        const exerciseId = await anExerciseId(coachAccess)
        const entryRes = await gql(
            `mutation { addExerciseEntry(input: { sessionId: "${sessionId}", exerciseId: "${exerciseId}" }) { entries { id } } }`,
            coachAccess,
        )
        const entryId: string = entryRes.body.data.addExerciseEntry.entries[0].id
        const setRes = await gql(
            `mutation { logSet(input: { sessionId: "${sessionId}", entryId: "${entryId}", plannedWeight: 100, plannedReps: 5 }) { entries { sets { id plannedWeightKg plannedReps weightKg } } } }`,
            coachAccess,
        )
        const setId: string = setRes.body.data.logSet.entries[0].sets[0].id

        // The athlete sees the planned session (owned by them) and logs the real set.
        const seen = await gql(
            `query { workoutSession(id: "${sessionId}") { plannedByUserId entries { sets { plannedWeightKg plannedReps weightKg } } } }`,
            athlete.access,
        )
        expect(seen.body.data.workoutSession.plannedByUserId).toBe(coachId)
        expect(seen.body.data.workoutSession.entries[0].sets[0]).toMatchObject({
            plannedWeightKg: 100,
            plannedReps: 5,
            weightKg: null,
        })

        const logged = await gql(
            `mutation { updateSet(input: { sessionId: "${sessionId}", entryId: "${entryId}", setId: "${setId}", weight: 102.5, reps: 5 }) { entries { sets { weightKg reps e1rmKg } } } }`,
            athlete.access,
        )
        expect(logged.body.data.updateSet.entries[0].sets[0]).toMatchObject({ weightKg: 102.5, reps: 5 })

        // It shows up in the athlete's history.
        const history = await gql(`query { workoutHistory { items { id } } }`, athlete.access)
        expect(history.body.data.workoutHistory.items.map((s: { id: string }) => s.id)).toContain(sessionId)
    })

    it('rejects planning for an athlete the coach is not linked to', async () => {
        const coach = await register('lonecoach@example.com')
        const stranger = await register('stranger@example.com')
        const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
        const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

        const res = await gql(
            `mutation { planWorkoutSession(input: { athleteId: "${stranger.userId}" }) { id } }`,
            coachAccess,
        )
        expect(res.body.errors[0].extensions.code).toBe('NOT_LINKED_TO_ATHLETE')
    })

    it('forbids a non-coach from planning', async () => {
        const athlete = await register('plainathlete@example.com')
        const other = await register('other@example.com')

        const res = await gql(
            `mutation { planWorkoutSession(input: { athleteId: "${other.userId}" }) { id } }`,
            athlete.access,
        )
        expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN')
    })
})
