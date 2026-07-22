import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import cookieParser from 'cookie-parser'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { LlmCompletionRequest } from '../src/ai/llm-provider.port'
import { LlmProviderRegistry } from '../src/ai/llm-provider.registry'
import { AppModule } from '../src/app.module'
import { PG_POOL } from '../src/database/database.module'
import * as schema from '../src/database/schema'
import { Mailer } from '../src/mail/mailer.port'
import { StubLlmProviderClient, stubRegistry } from '../tests/doubles/ai'
import { FakeMailer } from '../tests/doubles/shared'
import { grantPlan } from './helpers/grant-plan'
import { settleGeneration } from './helpers/settle-generation'

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>
let openai: StubLlmProviderClient

const COOKIE = { access: 'pl_at' }

/**
 * The logged weights the plan prompt carried, as numbers.
 *
 * `buildPlanUserPrompt` sends a sentence, then optionally the athlete's own
 * words, then the training context as pretty-printed JSON. The payload is always
 * last, which is what makes `lastIndexOf` a safe way back to it even when the
 * athlete's note happens to contain a brace.
 */
function historyWeightsIn(call: LlmCompletionRequest | undefined): (number | null)[] {
    const content = call?.messages[0]?.content ?? ''
    const start = content.lastIndexOf('\n\n{')
    if (start === -1) throw new Error('the plan prompt carried no JSON payload')

    const payload = JSON.parse(content.slice(start)) as {
        exercises: { recentSessions: { sets: { weightKg: number | null }[] }[] }[]
    }

    return payload.exercises
        .flatMap((exercise) => exercise.recentSessions)
        .flatMap((session) => session.sets)
        .map((set) => set.weightKg)
}

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
        // `subscriptions` holds a soft reference to users (no FK across modules), so
        // TRUNCATE ... CASCADE on users does not reach it — it must be named. The
        // `plans` catalog is seeded by migration and deliberately survives.
        'TRUNCATE TABLE users, profiles, coach_athlete_invitations, coach_athlete, workout_sessions, ai_plan_drafts, ai_generations, ai_provider_configs, notifications, subscriptions RESTART IDENTITY CASCADE',
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

/**
 * Store a (stubbed) provider key and make it the default — BYOK is per user —
 * and put the user on a plan that includes AI. The key alone is not enough: AI is
 * a paid feature, and a fresh account is on the free plan.
 */
async function withAiConfigured(user: { access: string; userId: string }, plan = 'coach-pro'): Promise<void> {
    await grantPlan(app, pool, user.userId, plan)

    const configured = await gql(
        `mutation { setAiProviderKey(input: { provider: "openai", apiKey: "sk-test-key-0123456789", model: "gpt-5" }) { provider } }`,
        user.access,
    )
    expect(configured.body.errors).toBeUndefined()
    await gql(`mutation { setAiProviderDefault(provider: "openai") { provider } }`, user.access)
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

    // The coach is the one who runs the AI here, so it is their plan that must
    // include it (the cookie is the pre-promotion one; the plan is by user id).
    await withAiConfigured({ access: coachAccess, userId: coach.userId })

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

        const queued = await gql(
            `mutation { generateSessionPlanDraft(input: { sessionId: "${sessionId}" }) { id status } }`,
            coachAccess,
        )
        expect(queued.body.errors).toBeUndefined()
        expect(queued.body.data.generateSessionPlanDraft.status).toBe('queued')

        const generation = await settleGeneration(gql, coachAccess, queued.body.data.generateSessionPlanDraft.id)
        expect(generation.status).toBe('succeeded')
        const draftId: string = generation.draftId!

        // What actually went to the model: the athlete's 100kg, never the coach's 200.
        //
        // Asserted over the parsed payload, so weights are compared as numbers.
        // A substring search over the serialized request cannot express this: the
        // prompt embeds entry ids, and a hex UUID like "2d1b200a-…" contains "200",
        // which failed this assertion at random for reasons having nothing to do
        // with whose history was used.
        const weights = historyWeightsIn(openai.completeCalls.at(-1))

        expect(weights).toContain(100)
        expect(weights).not.toContain(200)

        // Accepting writes the targets onto the athlete's session — the coach is the
        // one running this, so the draft is theirs, but the session stays the athlete's.
        const accepted = await gql(`mutation { acceptPlanDraft(draftId: "${draftId}") { status } }`, coachAccess)
        expect(accepted.body.errors).toBeUndefined()

        const session = await gql(
            `query { athleteWorkoutSession(athleteId: "${athlete.userId}", id: "${sessionId}") { userId entries { sets { plannedWeightKg plannedReps plannedRpe rpe outcome } } } }`,
            coachAccess,
        )
        expect(session.body.data.athleteWorkoutSession.userId).toBe(athlete.userId)
        expect(session.body.data.athleteWorkoutSession.entries[0].sets[0]).toMatchObject({
            plannedWeightKg: 105,
            plannedReps: 5,
            // The whole set is a target the athlete has yet to attempt.
            plannedRpe: 8,
            rpe: null,
            outcome: null,
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
