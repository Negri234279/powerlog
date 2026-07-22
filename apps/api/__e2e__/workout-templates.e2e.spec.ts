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
    await pool.query('TRUNCATE TABLE workout_templates RESTART IDENTITY CASCADE')
})

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

async function anExerciseId(access: string): Promise<string> {
    const res = await gql(`query { exercises(category: "squat") { id } }`, access)
    expect(res.body.errors).toBeUndefined()
    return res.body.data.exercises[0].id
}

describe('Workout templates via GraphQL', () => {
    it('creates a template, lists it, and starts a session pre-filled from it', async () => {
        const access = await registerUser('tmpl@example.com')
        const exerciseId = await anExerciseId(access)

        const created = await gql(
            `mutation { createWorkoutTemplate(input: {
                name: "Upper A",
                notes: "Push",
                exercises: [{ exerciseId: "${exerciseId}", sets: [
                    { unit: "lb", plannedWeight: "225", plannedReps: "5", rpe: "8" },
                    { plannedReps: "6-8" }
                ] }]
            }) { id name exercises { order exerciseId sets { order
                plannedWeightKg { min max } plannedReps { min max } rpe { min max } } } } }`,
            access,
        )
        expect(created.body.errors).toBeUndefined()
        const templateId: string = created.body.data.createWorkoutTemplate.id
        const sets = created.body.data.createWorkoutTemplate.exercises[0].sets
        expect(sets[0].plannedWeightKg).toEqual({ min: 102.06, max: 102.06 })
        expect(sets[0].rpe).toEqual({ min: 8, max: 8 })
        // The range survives the round trip that the single value takes.
        expect(sets[1].plannedReps).toEqual({ min: 6, max: 8 })

        const listed = await gql(`query { workoutTemplates { id name exerciseCount setCount } }`, access)
        expect(listed.body.errors).toBeUndefined()
        expect(listed.body.data.workoutTemplates).toHaveLength(1)
        expect(listed.body.data.workoutTemplates[0]).toMatchObject({ name: 'Upper A', exerciseCount: 1, setCount: 2 })

        const session = await gql(
            `mutation { createSessionFromTemplate(input: { templateId: "${templateId}", notes: "wk1" }) {
                id status notes entries { exerciseId sets {
                    plannedWeightKg { min max } plannedReps { min max } weightKg reps e1rmKg } } } }`,
            access,
        )
        expect(session.body.errors).toBeUndefined()
        const s = session.body.data.createSessionFromTemplate
        expect(s.status).toBe('planned')
        expect(s.entries[0].exerciseId).toBe(exerciseId)
        // Programmed copied; performed empty.
        expect(s.entries[0].sets[0]).toMatchObject({
            plannedWeightKg: { min: 102.06, max: 102.06 },
            weightKg: null,
            reps: null,
            e1rmKg: null,
        })
        // …and the coach's range reaches the athlete's session intact.
        expect(s.entries[0].sets[1].plannedReps).toEqual({ min: 6, max: 8 })
    })

    it('updates and deletes a template, and hides another user’s template', async () => {
        const access = await registerUser('owner-t@example.com')
        const exerciseId = await anExerciseId(access)
        const templateId: string = (
            await gql(
                `mutation { createWorkoutTemplate(input: { name: "A", exercises: [{ exerciseId: "${exerciseId}", sets: [{}] }] }) { id } }`,
                access,
            )
        ).body.data.createWorkoutTemplate.id

        const updated = await gql(
            `mutation { updateWorkoutTemplate(id: "${templateId}", input: { name: "B", exercises: [] }) { name exercises { id } } }`,
            access,
        )
        expect(updated.body.data.updateWorkoutTemplate).toMatchObject({ name: 'B', exercises: [] })

        const intruder = await registerUser('intruder-t@example.com')
        const hidden = await gql(`query { workoutTemplate(id: "${templateId}") { id } }`, intruder)
        expect(hidden.body.errors[0].extensions.code).toBe('WORKOUT_TEMPLATE_NOT_FOUND')

        const deleted = await gql(`mutation { deleteWorkoutTemplate(id: "${templateId}") }`, access)
        expect(deleted.body.data.deleteWorkoutTemplate).toBe(true)
        const gone = await gql(`query { workoutTemplate(id: "${templateId}") { id } }`, access)
        expect(gone.body.errors[0].extensions.code).toBe('WORKOUT_TEMPLATE_NOT_FOUND')
    })

    it('requires authentication', async () => {
        const res = await gql(`query { workoutTemplates { id } }`)
        expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    })
})
