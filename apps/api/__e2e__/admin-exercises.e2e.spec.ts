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
    // Drop any exercises created by previous tests; keep the seeded catalog.
    await pool.query("DELETE FROM exercises WHERE slug LIKE 'e2e-%'")
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

/** Register, flip is_admin in the DB, then log in so the JWT carries isAdmin=true. */
async function registerAdmin(email: string): Promise<string> {
    await registerUser(email)
    await pool.query('UPDATE users SET is_admin = true WHERE email = $1', [email])
    const res = await gql(`mutation { login(input: { email: "${email}", password: "supersecret" }) { id } }`)
    expect(res.body.errors).toBeUndefined()
    return cookiePair(setCookies(res), COOKIE.access)!
}

describe('Admin exercises via GraphQL', () => {
    it('forbids non-admins from listing or mutating the catalog', async () => {
        const access = await registerUser('plain@example.com')

        const list = await gql(`query { adminExercises { rows { id } } }`, access)
        expect(list.body.errors[0].extensions.code).toBe('FORBIDDEN')

        const create = await gql(
            `mutation { createExercise(input: { name: "Hack", category: "legs", equipment: "machine", primaryMuscle: "quads" }) { id } }`,
            access,
        )
        expect(create.body.errors[0].extensions.code).toBe('FORBIDDEN')
    })

    it('requires authentication', async () => {
        const res = await gql(`query { adminExercises { rows { id } } }`)
        expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    })

    it('accepts explicit null filter variables (as the web sends them)', async () => {
        const admin = await registerAdmin('nulls@example.com')

        const res = await request(httpServer)
            .post('/graphql')
            .set('Cookie', admin)
            .send({
                query: `query A($categories: [String!], $equipment: [String!], $muscles: [String!], $search: String) {
                    adminExercises(categories: $categories, equipment: $equipment, muscles: $muscles, search: $search) { rows { id } total }
                }`,
                variables: { categories: null, equipment: null, muscles: null, search: null },
            })

        expect(res.body.errors).toBeUndefined()
        expect(Array.isArray(res.body.data.adminExercises.rows)).toBe(true)
        expect(res.body.data.adminExercises.total).toBeGreaterThanOrEqual(40)
    })

    it('lets an admin create, filter, edit and delete an exercise', async () => {
        const admin = await registerAdmin('admin@example.com')

        const created = await gql(
            `mutation { createExercise(input: { name: "E2e Hack Squat", category: "legs", equipment: "machine", primaryMuscle: "quads", slug: "e2e-hack-squat" }) { id slug name } }`,
            admin,
        )
        expect(created.body.errors).toBeUndefined()
        const id: string = created.body.data.createExercise.id
        expect(created.body.data.createExercise.slug).toBe('e2e-hack-squat')

        const filtered = await gql(`query { adminExercises(search: "e2e-hack") { rows { id slug } total } }`, admin)
        expect(filtered.body.data.adminExercises.rows.map((e: { slug: string }) => e.slug)).toEqual(['e2e-hack-squat'])
        expect(filtered.body.data.adminExercises.total).toBe(1)

        const edited = await gql(
            `mutation { updateExercise(input: { exerciseId: "${id}", name: "E2e Hack Squat V2", primaryMuscle: "glutes" }) { name primaryMuscle slug } }`,
            admin,
        )
        expect(edited.body.data.updateExercise).toMatchObject({
            name: 'E2e Hack Squat V2',
            primaryMuscle: 'glutes',
            slug: 'e2e-hack-squat',
        })

        const deleted = await gql(`mutation { deleteExercise(exerciseId: "${id}") }`, admin)
        expect(deleted.body.data.deleteExercise).toBe(true)
    })

    it('rejects a duplicate slug', async () => {
        const admin = await registerAdmin('dup@example.com')
        await gql(
            `mutation { createExercise(input: { name: "E2e Dup", category: "legs", equipment: "machine", primaryMuscle: "quads", slug: "e2e-dup" }) { id } }`,
            admin,
        )

        const again = await gql(
            `mutation { createExercise(input: { name: "E2e Dup Two", category: "legs", equipment: "machine", primaryMuscle: "quads", slug: "e2e-dup" }) { id } }`,
            admin,
        )
        expect(again.body.errors[0].extensions.code).toBe('EXERCISE_SLUG_TAKEN')
    })

    it('refuses to delete an exercise used in a workout', async () => {
        const admin = await registerAdmin('owner-admin@example.com')
        const created = await gql(
            `mutation { createExercise(input: { name: "E2e Used", category: "legs", equipment: "machine", primaryMuscle: "quads", slug: "e2e-used" }) { id } }`,
            admin,
        )
        const exerciseId: string = created.body.data.createExercise.id

        // The admin logs the exercise in a real session, creating a reference.
        const sessionId: string = (await gql(`mutation { createWorkoutSession { id } }`, admin)).body.data
            .createWorkoutSession.id
        await gql(
            `mutation { addExerciseEntry(input: { sessionId: "${sessionId}", exerciseId: "${exerciseId}" }) { id } }`,
            admin,
        )

        const res = await gql(`mutation { deleteExercise(exerciseId: "${exerciseId}") }`, admin)
        expect(res.body.errors[0].extensions.code).toBe('EXERCISE_IN_USE')
    })
})
