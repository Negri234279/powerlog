import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import cookieParser from 'cookie-parser'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { LlmProviderRegistry } from '../src/ai/llm-provider.registry'
import { AppModule } from '../src/app.module'
import { PG_POOL } from '../src/database/database.module'
import * as schema from '../src/database/schema'
import { Mailer } from '../src/mail/mailer.port'
import { StubLlmProviderClient, stubRegistry } from '../tests/doubles/ai'
import { FakeMailer } from '../tests/doubles/shared'

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>
let openai: StubLlmProviderClient

const COOKIE = { access: 'pl_at' }

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    const testPool = new Pool({ connectionString: container.getConnectionUri() })
    // The whole registry is stubbed: no real provider is reached, and the test
    // both scripts the answer and inspects the prompt that was sent.
    openai = new StubLlmProviderClient('openai')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PG_POOL)
        .useValue(testPool)
        .overrideProvider(Mailer)
        .useValue(new FakeMailer())
        .overrideProvider(LlmProviderRegistry)
        .useValue(stubRegistry(openai))
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
        'TRUNCATE TABLE users, profiles, coach_athlete_invitations, coach_athlete, workout_sessions, ai_plan_drafts, ai_provider_configs, notifications RESTART IDENTITY CASCADE',
    )
    openai.reset()
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
    const username = email.split('@')[0]!
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${username}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()

    return { access: cookiePair(setCookies(res), COOKIE.access)!, userId: res.body.data.register.id }
}

/** Store a (stubbed) provider key and make it the default — BYOK is per user. */
async function withAiConfigured(access: string): Promise<void> {
    const configured = await gql(
        `mutation { setAiProviderKey(input: { provider: "openai", apiKey: "sk-test-key-0123456789", model: "gpt-5" }) { provider } }`,
        access,
    )
    expect(configured.body.errors).toBeUndefined()
    await gql(`mutation { setAiProviderDefault(provider: "openai") { provider } }`, access)
}

async function anExerciseId(access: string): Promise<string> {
    const res = await gql(`query { exercises { id } }`, access)
    return res.body.data.exercises[0].id
}

/** A completed session of one exercise at one weight — the marks the model sees. */
async function aCompletedSessionOf(access: string, exerciseId: string, weight: number): Promise<void> {
    const created = await gql(`mutation { createWorkoutSession { id } }`, access)
    const sessionId: string = created.body.data.createWorkoutSession.id

    const entry = await gql(
        `mutation { addExerciseEntry(input: { sessionId: "${sessionId}", exerciseId: "${exerciseId}" }) { entries { id } } }`,
        access,
    )
    const entryId: string = entry.body.data.addExerciseEntry.entries[0].id
    await gql(
        `mutation { logSet(input: { sessionId: "${sessionId}", entryId: "${entryId}", weight: ${weight}, reps: 5 }) { id } }`,
        access,
    )
    await gql(`mutation { completeWorkoutSession(id: "${sessionId}") { status } }`, access)
}

/** Coach + athlete, linked, with the coach's AI configured. */
async function linkedPair(): Promise<{ coachAccess: string; athlete: { access: string; userId: string } }> {
    const coach = await register('coach@example.com')
    const athlete = await register('athlete@example.com')

    const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
    const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

    const invited = await gql(`mutation { inviteAthlete(email: "athlete@example.com") { id } }`, coachAccess)
    await gql(`mutation { acceptInvitation(id: "${invited.body.data.inviteAthlete.id}") { status } }`, athlete.access)

    await withAiConfigured(coachAccess)

    return { coachAccess, athlete }
}

describe('AI session plan — a coach programming for an athlete', () => {
    it("feeds the model the ATHLETE's marks and writes the plan onto their session", async () => {
        const { coachAccess, athlete } = await linkedPair()

        // Both have trained the same lift; the coach is far stronger, so the number
        // that shows up in the prompt says whose history was used.
        const exerciseId = await anExerciseId(coachAccess)
        await aCompletedSessionOf(athlete.access, exerciseId, 100)
        await aCompletedSessionOf(coachAccess, exerciseId, 200)

        const planned = await gql(
            `mutation { planWorkoutSession(input: { athleteId: "${athlete.userId}" }) { id } }`,
            coachAccess,
        )
        const sessionId: string = planned.body.data.planWorkoutSession.id
        const entry = await gql(
            `mutation { addExerciseEntry(input: { sessionId: "${sessionId}", exerciseId: "${exerciseId}" }) { entries { id } } }`,
            coachAccess,
        )
        const entryId: string = entry.body.data.addExerciseEntry.entries[0].id

        openai.willAnswer(
            JSON.stringify({
                rationale: 'Small jump on last session.',
                exercises: [
                    {
                        entryId,
                        sets: [{ weightKg: 105, reps: 5, rpe: 8, rir: null, note: 'top set' }],
                    },
                ],
            }),
        )

        const generated = await gql(
            `mutation { generateSessionPlanDraft(input: { sessionId: "${sessionId}" }) { id status } }`,
            coachAccess,
        )
        expect(generated.body.errors).toBeUndefined()
        const draftId: string = generated.body.data.generateSessionPlanDraft.id

        // What actually went to the model: the athlete's 100kg, never the coach's 200.
        const prompt = JSON.stringify(openai.completeCalls.at(-1))
        expect(prompt).toContain('100')
        expect(prompt).not.toContain('200')

        // Accepting writes the targets onto the athlete's session — the coach is the
        // one running this, so the draft is theirs, but the session stays the athlete's.
        const accepted = await gql(`mutation { acceptPlanDraft(draftId: "${draftId}") { status } }`, coachAccess)
        expect(accepted.body.errors).toBeUndefined()

        const session = await gql(
            `query { athleteWorkoutSession(athleteId: "${athlete.userId}", id: "${sessionId}") { userId entries { sets { plannedWeightKg plannedReps rpe } } } }`,
            coachAccess,
        )
        expect(session.body.data.athleteWorkoutSession.userId).toBe(athlete.userId)
        expect(session.body.data.athleteWorkoutSession.entries[0].sets[0]).toMatchObject({
            plannedWeightKg: 105,
            plannedReps: 5,
            rpe: 8,
        })
    })

    it('refuses to program a session for someone who is not their athlete', async () => {
        const { coachAccess } = await linkedPair()
        const stranger = await register('stranger@example.com')

        // The stranger plans their own session; the coach may not touch it.
        const created = await gql(`mutation { createWorkoutSession { id } }`, stranger.access)
        const sessionId: string = created.body.data.createWorkoutSession.id
        const exerciseId = await anExerciseId(stranger.access)
        await gql(
            `mutation { addExerciseEntry(input: { sessionId: "${sessionId}", exerciseId: "${exerciseId}" }) { id } }`,
            stranger.access,
        )

        const res = await gql(
            `mutation { generateSessionPlanDraft(input: { sessionId: "${sessionId}" }) { id } }`,
            coachAccess,
        )

        expect(res.body.data).toBeNull()
        expect(res.body.errors[0].extensions.code).toBe('SESSION_NOT_PROGRAMMABLE')
        // Nothing was ever sent to the provider.
        expect(openai.completeCalls).toHaveLength(0)
    })
})
