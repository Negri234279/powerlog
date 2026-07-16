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
    // Keep the seeded exercise catalog; clear users + sessions (cascade).
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

/** A valid username derived from the email local-part (a–z0–9_, min 3 chars). */
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

async function anExerciseId(access: string): Promise<string> {
    const res = await gql(`query { exercises(category: "squat") { id slug } }`, access)
    expect(res.body.errors).toBeUndefined()
    return res.body.data.exercises[0].id
}

describe('Workouts CRUD via GraphQL', () => {
    it('runs the full session lifecycle: create → add exercise → log/edit set → complete → read → delete', async () => {
        const access = await registerUser('lifter@example.com')
        const exerciseId = await anExerciseId(access)

        const created = await gql(`mutation { createWorkoutSession { id status entries { id } } }`, access)
        expect(created.body.errors).toBeUndefined()
        const sessionId: string = created.body.data.createWorkoutSession.id
        expect(created.body.data.createWorkoutSession.status).toBe('planned')

        const added = await gql(
            `mutation { addExerciseEntry(input: { sessionId: "${sessionId}", exerciseId: "${exerciseId}" }) { entries { id exerciseId order } } }`,
            access,
        )
        expect(added.body.errors).toBeUndefined()
        const entryId: string = added.body.data.addExerciseEntry.entries[0].id

        const logged = await gql(
            `mutation { logSet(input: { sessionId: "${sessionId}", entryId: "${entryId}", unit: "lb", weight: 225, reps: 5, rpe: 8 }) { entries { sets { id weightKg reps rpe e1rmKg } } } }`,
            access,
        )
        expect(logged.body.errors).toBeUndefined()
        const set = logged.body.data.logSet.entries[0].sets[0]
        expect(set.weightKg).toBe(102.06)
        expect(set.e1rmKg).toBeCloseTo(119.07, 2)

        const updated = await gql(
            `mutation { updateSet(input: { sessionId: "${sessionId}", entryId: "${entryId}", setId: "${set.id}", reps: 3 }) { entries { sets { reps e1rmKg } } } }`,
            access,
        )
        expect(updated.body.data.updateSet.entries[0].sets[0].reps).toBe(3)

        const completed = await gql(`mutation { completeWorkoutSession(id: "${sessionId}") { status } }`, access)
        expect(completed.body.data.completeWorkoutSession.status).toBe('completed')

        const read = await gql(
            `query { workoutSession(id: "${sessionId}") { id status entries { sets { id } } } }`,
            access,
        )
        expect(read.body.data.workoutSession.entries[0].sets).toHaveLength(1)

        const deleted = await gql(`mutation { deleteWorkoutSession(id: "${sessionId}") }`, access)
        expect(deleted.body.data.deleteWorkoutSession).toBe(true)

        const gone = await gql(`query { workoutSession(id: "${sessionId}") { id } }`, access)
        expect(gone.body.errors[0].extensions.code).toBe('WORKOUT_SESSION_NOT_FOUND')
    })

    it("hides another user's session", async () => {
        const owner = await registerUser('owner@example.com')
        const created = await gql(`mutation { createWorkoutSession { id } }`, owner)
        const sessionId: string = created.body.data.createWorkoutSession.id

        const intruder = await registerUser('intruder@example.com')
        const res = await gql(`query { workoutSession(id: "${sessionId}") { id } }`, intruder)
        expect(res.body.errors[0].extensions.code).toBe('WORKOUT_SESSION_NOT_FOUND')
    })

    it('rejects a set carrying both RPE and RIR', async () => {
        const access = await registerUser('intensity@example.com')
        const exerciseId = await anExerciseId(access)
        const sessionId: string = (await gql(`mutation { createWorkoutSession { id } }`, access)).body.data
            .createWorkoutSession.id
        const entryId: string = (
            await gql(
                `mutation { addExerciseEntry(input: { sessionId: "${sessionId}", exerciseId: "${exerciseId}" }) { entries { id } } }`,
                access,
            )
        ).body.data.addExerciseEntry.entries[0].id

        const res = await gql(
            `mutation { logSet(input: { sessionId: "${sessionId}", entryId: "${entryId}", weight: 100, reps: 5, rpe: 8, rir: 2 }) { id } }`,
            access,
        )
        expect(res.body.errors[0].extensions.code).toBe('CONFLICTING_INTENSITY')
    })

    it('reports per-exercise volume and PRs after logging a set', async () => {
        const access = await registerUser('stats@example.com')
        const exerciseId = await anExerciseId(access)
        const sessionId: string = (await gql(`mutation { createWorkoutSession { id } }`, access)).body.data
            .createWorkoutSession.id
        const entryId: string = (
            await gql(
                `mutation { addExerciseEntry(input: { sessionId: "${sessionId}", exerciseId: "${exerciseId}" }) { entries { id } } }`,
                access,
            )
        ).body.data.addExerciseEntry.entries[0].id
        await gql(
            `mutation { logSet(input: { sessionId: "${sessionId}", entryId: "${entryId}", weight: 100, reps: 5 }) { id } }`,
            access,
        )

        const res = await gql(
            `query { exerciseStats { exerciseId totalVolumeKg totalSets totalReps bestE1rmKg heaviestWeightKg } }`,
            access,
        )
        expect(res.body.errors).toBeUndefined()
        const row = res.body.data.exerciseStats.find((r: { exerciseId: string }) => r.exerciseId === exerciseId)
        expect(row).toMatchObject({ totalVolumeKg: 500, totalSets: 1, totalReps: 5, heaviestWeightKg: 100 })
        expect(row.bestE1rmKg).toBeCloseTo(116.67, 2)
    })

    it('paginates the session history newest-first via cursor', async () => {
        const access = await registerUser('history@example.com')
        const exerciseId = await anExerciseId(access)

        // Older session, no sets.
        await gql(
            `mutation { createWorkoutSession(input: { performedAt: "2026-01-01T00:00:00.000Z" }) { id } }`,
            access,
        )

        // Newer session with one logged set (volume 100×5 = 500).
        const newerId: string = (
            await gql(
                `mutation { createWorkoutSession(input: { performedAt: "2026-02-01T00:00:00.000Z" }) { id } }`,
                access,
            )
        ).body.data.createWorkoutSession.id
        const entryId: string = (
            await gql(
                `mutation { addExerciseEntry(input: { sessionId: "${newerId}", exerciseId: "${exerciseId}" }) { entries { id } } }`,
                access,
            )
        ).body.data.addExerciseEntry.entries[0].id
        await gql(
            `mutation { logSet(input: { sessionId: "${newerId}", entryId: "${entryId}", weight: 100, reps: 5 }) { id } }`,
            access,
        )

        const page1 = await gql(
            `query { workoutHistory(limit: 1) { items { id exerciseCount setCount totalVolumeKg } nextCursor hasNextPage } }`,
            access,
        )
        expect(page1.body.errors).toBeUndefined()
        expect(page1.body.data.workoutHistory.hasNextPage).toBe(true)
        const top = page1.body.data.workoutHistory.items[0]
        expect(top.id).toBe(newerId)
        expect(top).toMatchObject({ exerciseCount: 1, setCount: 1, totalVolumeKg: 500 })

        const cursor: string = page1.body.data.workoutHistory.nextCursor
        const page2 = await gql(
            `query { workoutHistory(limit: 1, cursor: "${cursor}") { items { id } nextCursor hasNextPage } }`,
            access,
        )
        expect(page2.body.data.workoutHistory.hasNextPage).toBe(false)
        expect(page2.body.data.workoutHistory.items).toHaveLength(1)
        expect(page2.body.data.workoutHistory.nextCursor).toBeNull()
    })

    it('rejects a malformed history cursor', async () => {
        const access = await registerUser('badcursor@example.com')
        const res = await gql(`query { workoutHistory(cursor: "not-a-cursor") { hasNextPage } }`, access)
        expect(res.body.errors[0].extensions.code).toBe('INVALID_WORKOUT_CURSOR')
    })

    it('requires authentication', async () => {
        const res = await gql(`mutation { createWorkoutSession { id } }`)
        expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    })

    it('marks a programmed set done, keeping the prescription it fell short of', async () => {
        const access = await registerUser('marks@example.com')
        const exerciseId = await anExerciseId(access)

        // The programme: 100 kg × 5 @ RPE 8.
        const template = await gql(
            `mutation { createWorkoutTemplate(input: { name: "Squat day", exercises: [{ exerciseId: "${exerciseId}",
                sets: [{ plannedWeight: 100, plannedReps: 5, rpe: 8 }] }] }) { id } }`,
            access,
        )
        const templateId: string = template.body.data.createWorkoutTemplate.id

        const created = await gql(
            `mutation { createSessionFromTemplate(input: { templateId: "${templateId}" }) {
                id entries { id sets { id plannedWeightKg plannedReps plannedRpe rpe outcome } } } }`,
            access,
        )
        expect(created.body.errors).toBeUndefined()
        const session = created.body.data.createSessionFromTemplate
        const entryId: string = session.entries[0].id
        const setId: string = session.entries[0].sets[0].id
        // Materializing copies targets — including the target RPE, which used to
        // land in the field meant for what the athlete actually felt.
        expect(session.entries[0].sets[0]).toMatchObject({ plannedRpe: 8, rpe: null, outcome: null })

        // The athlete got 95×5 and it felt like a 9.5: a failed set that is still real work.
        const marked = await gql(
            `mutation { completeSet(input: { sessionId: "${session.id}", entryId: "${entryId}", setId: "${setId}",
                outcome: "failed", weight: 95, reps: 5, rpe: 9.5 }) {
                entries { sets { plannedWeightKg plannedReps plannedRpe weightKg reps rpe e1rmKg outcome } } } }`,
            access,
        )
        expect(marked.body.errors).toBeUndefined()
        const set = marked.body.data.completeSet.entries[0].sets[0]
        expect(set).toMatchObject({ outcome: 'failed', weightKg: 95, reps: 5, rpe: 9.5 })
        expect(set).toMatchObject({ plannedWeightKg: 100, plannedReps: 5, plannedRpe: 8 })
        // A failed set is still a set that happened: it has an e1RM like any other.
        expect(set.e1rmKg).toBeCloseTo(110.83, 2)

        // Correcting a mis-mark goes through the edit, and only touches the
        // outcome: un-marking is not a claim that the training didn't happen.
        const undone = await gql(
            `mutation { updateSet(input: { sessionId: "${session.id}", entryId: "${entryId}", setId: "${setId}",
                outcome: null }) { entries { sets { weightKg reps outcome } } } }`,
            access,
        )
        expect(undone.body.data.updateSet.entries[0].sets[0]).toMatchObject({
            outcome: null,
            weightKg: 95,
            reps: 5,
        })
    })

    it('rejects an outcome that is not success or failed', async () => {
        const access = await registerUser('badoutcome@example.com')
        const exerciseId = await anExerciseId(access)
        const session = (await gql(`mutation { createWorkoutSession { id } }`, access)).body.data.createWorkoutSession
        const entry = (
            await gql(
                `mutation { addExerciseEntry(input: { sessionId: "${session.id}", exerciseId: "${exerciseId}" }) { entries { id } } }`,
                access,
            )
        ).body.data.addExerciseEntry.entries[0]
        const setId = (
            await gql(
                `mutation { logSet(input: { sessionId: "${session.id}", entryId: "${entry.id}", plannedReps: 5 }) { entries { sets { id } } } }`,
                access,
            )
        ).body.data.logSet.entries[0].sets[0].id

        const res = await gql(
            `mutation { completeSet(input: { sessionId: "${session.id}", entryId: "${entry.id}", setId: "${setId}",
                outcome: "maybe" }) { id } }`,
            access,
        )
        expect(res.body.errors[0].extensions.code).toBe('BAD_REQUEST')
    })

    it("hides another user's set from being marked", async () => {
        const access = await registerUser('setowner@example.com')
        const exerciseId = await anExerciseId(access)
        const session = (await gql(`mutation { createWorkoutSession { id } }`, access)).body.data.createWorkoutSession
        const entry = (
            await gql(
                `mutation { addExerciseEntry(input: { sessionId: "${session.id}", exerciseId: "${exerciseId}" }) { entries { id } } }`,
                access,
            )
        ).body.data.addExerciseEntry.entries[0]
        const setId = (
            await gql(
                `mutation { logSet(input: { sessionId: "${session.id}", entryId: "${entry.id}", plannedReps: 5 }) { entries { sets { id } } } }`,
                access,
            )
        ).body.data.logSet.entries[0].sets[0].id

        const intruder = await registerUser('setintruder@example.com')
        const res = await gql(
            `mutation { completeSet(input: { sessionId: "${session.id}", entryId: "${entry.id}", setId: "${setId}",
                outcome: "success", weight: 100, reps: 5 }) { id } }`,
            intruder,
        )
        expect(res.body.errors[0].extensions.code).toBe('WORKOUT_SESSION_NOT_FOUND')
    })
})
