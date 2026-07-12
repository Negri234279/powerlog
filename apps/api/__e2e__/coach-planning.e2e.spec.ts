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
    // `profiles` holds the handle (soft ref to users), so it must be cleared too
    // or a re-registered email collides on username.
    await pool.query(
        'TRUNCATE TABLE users, profiles, coach_athlete_invitations, coach_athlete, workout_sessions, mesocycles, notifications RESTART IDENTITY CASCADE',
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

describe("Coach reading an athlete's training", () => {
    /** The athlete trains on their own: one completed session with a logged set. */
    async function aCompletedSession(athleteAccess: string): Promise<string> {
        const created = await gql(`mutation { createWorkoutSession { id } }`, athleteAccess)
        const sessionId: string = created.body.data.createWorkoutSession.id

        const exerciseId = await anExerciseId(athleteAccess)
        const entry = await gql(
            `mutation { addExerciseEntry(input: { sessionId: "${sessionId}", exerciseId: "${exerciseId}" }) { entries { id } } }`,
            athleteAccess,
        )
        const entryId: string = entry.body.data.addExerciseEntry.entries[0].id
        await gql(
            `mutation { logSet(input: { sessionId: "${sessionId}", entryId: "${entryId}", weight: 100, reps: 5, rpe: 8 }) { id } }`,
            athleteAccess,
        )
        await gql(`mutation { completeWorkoutSession(id: "${sessionId}") { status } }`, athleteAccess)

        return sessionId
    }

    /** A completed session of one given exercise at one given weight. */
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

    it("lets a linked coach read the athlete's history, session detail and KPIs", async () => {
        const { coachAccess, athlete } = await linkedCoachAndAthlete()
        const sessionId = await aCompletedSession(athlete.access)

        const history = await gql(
            `query { athleteWorkoutHistory(athleteId: "${athlete.userId}") { items { id status } } }`,
            coachAccess,
        )
        expect(history.body.errors).toBeUndefined()
        expect(history.body.data.athleteWorkoutHistory.items).toMatchObject([{ id: sessionId, status: 'completed' }])

        const detail = await gql(
            `query { athleteWorkoutSession(athleteId: "${athlete.userId}", id: "${sessionId}") { userId entries { sets { weightKg reps } } } }`,
            coachAccess,
        )
        expect(detail.body.data.athleteWorkoutSession.userId).toBe(athlete.userId)
        expect(detail.body.data.athleteWorkoutSession.entries[0].sets[0]).toMatchObject({ weightKg: 100, reps: 5 })

        const summary = await gql(
            `query { athleteTrainingSummary(athleteId: "${athlete.userId}") { sessions totalSets totalVolumeKg } }`,
            coachAccess,
        )
        expect(summary.body.data.athleteTrainingSummary).toMatchObject({
            sessions: 1,
            totalSets: 1,
            totalVolumeKg: 500,
        })

        const stats = await gql(
            `query { athleteExerciseStats(athleteId: "${athlete.userId}") { exerciseId totalVolumeKg } }`,
            coachAccess,
        )
        expect(stats.body.data.athleteExerciseStats).toHaveLength(1)
    })

    it("shows the coach the ATHLETE's previous marks for an exercise, never their own", async () => {
        const { coachAccess, athlete } = await linkedCoachAndAthlete()

        // The same exercise, trained by both — the coach is far stronger, so the
        // weights alone say whose history came back.
        const exerciseId = await anExerciseId(coachAccess)
        await aCompletedSessionOf(athlete.access, exerciseId, 100)
        await aCompletedSessionOf(coachAccess, exerciseId, 200)

        const marks = await gql(
            `query { athleteExerciseSessionHistory(athleteId: "${athlete.userId}", exerciseId: "${exerciseId}") { sets { weightKg } } }`,
            coachAccess,
        )
        expect(marks.body.errors).toBeUndefined()
        expect(marks.body.data.athleteExerciseSessionHistory).toHaveLength(1)
        expect(marks.body.data.athleteExerciseSessionHistory[0].sets[0].weightKg).toBe(100)

        // The coach's own query still answers with the coach's own numbers — the
        // panel picks the right one, the API doesn't guess.
        const own = await gql(
            `query { exerciseSessionHistory(exerciseId: "${exerciseId}") { sets { weightKg } } }`,
            coachAccess,
        )
        expect(own.body.data.exerciseSessionHistory[0].sets[0].weightKg).toBe(200)
    })

    it('rejects a coach reading the marks of an athlete they are not linked to', async () => {
        const { coachAccess } = await linkedCoachAndAthlete()
        const stranger = await register('stranger@example.com')
        const exerciseId = await anExerciseId(coachAccess)

        const res = await gql(
            `query { athleteExerciseSessionHistory(athleteId: "${stranger.userId}", exerciseId: "${exerciseId}") { sessionId } }`,
            coachAccess,
        )
        expect(res.body.errors[0].extensions.code).toBe('NOT_LINKED_TO_ATHLETE')
    })

    it('rejects a coach reading an athlete they are not linked to', async () => {
        const { coachAccess } = await linkedCoachAndAthlete()
        const stranger = await register('stranger@example.com')

        const res = await gql(
            `query { athleteWorkoutHistory(athleteId: "${stranger.userId}") { items { id } } }`,
            coachAccess,
        )
        expect(res.body.errors[0].extensions.code).toBe('NOT_LINKED_TO_ATHLETE')
    })

    it("does not expose a stranger's session through a linked athlete's id", async () => {
        const { coachAccess, athlete } = await linkedCoachAndAthlete()
        const stranger = await register('stranger@example.com')
        const strangerSessionId = await aCompletedSession(stranger.access)

        const res = await gql(
            `query { athleteWorkoutSession(athleteId: "${athlete.userId}", id: "${strangerSessionId}") { id } }`,
            coachAccess,
        )
        expect(res.body.errors[0].extensions.code).toBe('WORKOUT_SESSION_NOT_FOUND')
    })

    it('forbids a non-coach from reading another user’s training', async () => {
        const athlete = await register('plainathlete@example.com')
        const other = await register('other@example.com')

        const res = await gql(
            `query { athleteWorkoutHistory(athleteId: "${other.userId}") { items { id } } }`,
            athlete.access,
        )
        expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN')
    })
})

describe('Coach mesocycles for an athlete', () => {
    /** A one-week block with a single training day, as the coach would compose it. */
    function blockInput(exerciseId: string): string {
        return `{
            name: "Coached Block"
            goal: "strength"
            startDate: "2026-03-02"
            microcycles: [
                {
                    label: "Week 1"
                    days: [
                        {
                            dayOffset: 0
                            label: "Squat day"
                            exercises: [
                                { exerciseId: "${exerciseId}", sets: [{ plannedWeight: 100, plannedReps: 5, rpe: 8 }] }
                            ]
                        }
                    ]
                }
            ]
        }`
    }

    it('lets the coach build a block the athlete owns, generate its week, and keeps it read-only for them', async () => {
        const { coachAccess, coachId, athlete } = await linkedCoachAndAthlete()
        const exerciseId = await anExerciseId(coachAccess)

        const created = await gql(
            `mutation { createAthleteMesocycle(athleteId: "${athlete.userId}", input: ${blockInput(exerciseId)}) { id ownerId plannedByUserId status } }`,
            coachAccess,
        )
        expect(created.body.errors).toBeUndefined()
        expect(created.body.data.createAthleteMesocycle).toMatchObject({
            ownerId: athlete.userId,
            plannedByUserId: coachId,
            status: 'draft',
        })
        const mesocycleId: string = created.body.data.createAthleteMesocycle.id

        // The athlete sees the block in their own library, flagged as coached.
        const theirs = await gql(`query { mesocycles { id plannedByUserId } }`, athlete.access)
        expect(theirs.body.data.mesocycles).toMatchObject([{ id: mesocycleId, plannedByUserId: coachId }])

        // ...but cannot edit it: their coach owns the plan.
        const edit = await gql(
            `mutation { updateMesocycle(id: "${mesocycleId}", input: ${blockInput(exerciseId)}) { id } }`,
            athlete.access,
        )
        expect(edit.body.errors[0].extensions.code).toBe('MESOCYCLE_MANAGED_BY_COACH')

        // The coach generates week 1 into the athlete's calendar.
        const generated = await gql(
            `mutation { generateMesocycleWeek(input: { mesocycleId: "${mesocycleId}", week: 1 }) { id userId plannedByUserId status entries { sets { plannedWeightKg plannedReps } } } }`,
            coachAccess,
        )
        expect(generated.body.errors).toBeUndefined()
        expect(generated.body.data.generateMesocycleWeek).toHaveLength(1)
        const session = generated.body.data.generateMesocycleWeek[0]
        expect(session).toMatchObject({ userId: athlete.userId, plannedByUserId: coachId, status: 'planned' })
        expect(session.entries[0].sets[0]).toMatchObject({ plannedWeightKg: 100, plannedReps: 5 })

        // It lands in the athlete's own history, ready to train.
        const history = await gql(`query { workoutHistory { items { id } } }`, athlete.access)
        expect(history.body.data.workoutHistory.items.map((s: { id: string }) => s.id)).toContain(session.id)
    })

    it('copies one of the coach’s own blocks to the athlete, leaving the source in their library', async () => {
        const { coachAccess, coachId, athlete } = await linkedCoachAndAthlete()
        const exerciseId = await anExerciseId(coachAccess)

        const own = await gql(
            `mutation { createMesocycle(input: ${blockInput(exerciseId)}) { id ownerId plannedByUserId } }`,
            coachAccess,
        )
        const sourceId: string = own.body.data.createMesocycle.id
        expect(own.body.data.createMesocycle).toMatchObject({ ownerId: coachId, plannedByUserId: null })

        const assigned = await gql(
            `mutation { assignMesocycleToAthlete(athleteId: "${athlete.userId}", mesocycleId: "${sourceId}", startDate: "2026-04-06") { id ownerId plannedByUserId startDate microcycles { days { exercises { sets { plannedWeightKg } } } } } }`,
            coachAccess,
        )
        expect(assigned.body.errors).toBeUndefined()
        const copy = assigned.body.data.assignMesocycleToAthlete
        expect(copy).toMatchObject({ ownerId: athlete.userId, plannedByUserId: coachId })
        expect(copy.id).not.toBe(sourceId)
        expect(copy.microcycles[0].days[0].exercises[0].sets[0].plannedWeightKg).toBe(100)

        // The coach still owns the original; the athlete only has the copy.
        const coachLibrary = await gql(`query { mesocycles { id } }`, coachAccess)
        expect(coachLibrary.body.data.mesocycles.map((m: { id: string }) => m.id)).toEqual([sourceId])

        const coachView = await gql(
            `query { athleteMesocycles(athleteId: "${athlete.userId}") { id plannedByUserId } }`,
            coachAccess,
        )
        expect(coachView.body.data.athleteMesocycles).toMatchObject([{ id: copy.id, plannedByUserId: coachId }])
    })

    it('rejects assigning a block to an athlete the coach does not coach', async () => {
        const { coachAccess } = await linkedCoachAndAthlete()
        const stranger = await register('stranger@example.com')
        const exerciseId = await anExerciseId(coachAccess)

        const own = await gql(`mutation { createMesocycle(input: ${blockInput(exerciseId)}) { id } }`, coachAccess)
        const sourceId: string = own.body.data.createMesocycle.id

        const res = await gql(
            `mutation { assignMesocycleToAthlete(athleteId: "${stranger.userId}", mesocycleId: "${sourceId}") { id } }`,
            coachAccess,
        )
        expect(res.body.errors[0].extensions.code).toBe('NOT_LINKED_TO_ATHLETE')
    })
})

describe('Ending the coaching relationship', () => {
    it('cuts the ex-coach off from the athlete, who keeps everything that was planned', async () => {
        const { coachAccess, athlete } = await linkedCoachAndAthlete()

        const planned = await gql(
            `mutation { planWorkoutSession(input: { athleteId: "${athlete.userId}" }) { id } }`,
            coachAccess,
        )
        const sessionId: string = planned.body.data.planWorkoutSession.id

        const removed = await gql(`mutation { removeAthlete(athleteId: "${athlete.userId}") }`, coachAccess)
        expect(removed.body.errors).toBeUndefined()
        expect(removed.body.data.removeAthlete).toBe(true)

        // Both sides see the relationship gone.
        const athletes = await gql(`query { myAthletes { userId } }`, coachAccess)
        expect(athletes.body.data.myAthletes).toEqual([])
        const coaches = await gql(`query { myCoaches { userId } }`, athlete.access)
        expect(coaches.body.data.myCoaches).toEqual([])

        // The ex-coach can no longer read the athlete...
        const history = await gql(
            `query { athleteWorkoutHistory(athleteId: "${athlete.userId}") { items { id } } }`,
            coachAccess,
        )
        expect(history.body.errors[0].extensions.code).toBe('NOT_LINKED_TO_ATHLETE')

        // ...nor touch the session they planned (it is the athlete's now).
        const edit = await gql(
            `mutation { updateWorkoutSession(input: { sessionId: "${sessionId}", notes: "sneaky" }) { id } }`,
            coachAccess,
        )
        expect(edit.body.errors[0].extensions.code).toBe('WORKOUT_SESSION_NOT_FOUND')

        // The athlete still owns it and can train it.
        const mine = await gql(`query { workoutSession(id: "${sessionId}") { id } }`, athlete.access)
        expect(mine.body.data.workoutSession.id).toBe(sessionId)
    })

    it('lets the athlete leave their coach', async () => {
        const { coachAccess, coachId, athlete } = await linkedCoachAndAthlete()

        const left = await gql(`mutation { leaveCoach(coachId: "${coachId}") }`, athlete.access)
        expect(left.body.errors).toBeUndefined()

        const athletes = await gql(`query { myAthletes { userId } }`, coachAccess)
        expect(athletes.body.data.myAthletes).toEqual([])
    })

    it('rejects removing a user who is not your athlete, and leaving a user who is not your coach', async () => {
        const { coachAccess, athlete } = await linkedCoachAndAthlete()
        const stranger = await register('stranger@example.com')

        const removed = await gql(`mutation { removeAthlete(athleteId: "${stranger.userId}") }`, coachAccess)
        expect(removed.body.errors[0].extensions.code).toBe('NOT_YOUR_ATHLETE')

        const left = await gql(`mutation { leaveCoach(coachId: "${stranger.userId}") }`, athlete.access)
        expect(left.body.errors[0].extensions.code).toBe('NOT_YOUR_COACH')
    })
})

describe('Coaching notifications', () => {
    /** Event handlers run async off the bus, so poll the bell for the kind we expect. */
    async function bellFor(access: string, type: string): Promise<Record<string, unknown>> {
        for (let i = 0; i < 40; i++) {
            const res = await gql(`query { myNotifications(limit: 10) { items { type data } } }`, access)
            const items: Array<{ type: string; data: string }> = res.body.data.myNotifications.items
            const found = items.find((n) => n.type === type)
            if (found) return JSON.parse(found.data)
            await new Promise((r) => setTimeout(r, 25))
        }
        throw new Error(`no ${type} notification arrived in time`)
    }

    it('bells the athlete when their coach plans a session for them', async () => {
        const { coachAccess, coachId, athlete } = await linkedCoachAndAthlete()

        const planned = await gql(
            `mutation { planWorkoutSession(input: { athleteId: "${athlete.userId}" }) { id } }`,
            coachAccess,
        )
        const sessionId: string = planned.body.data.planWorkoutSession.id

        const note = await bellFor(athlete.access, 'session_planned')
        expect(note).toMatchObject({ sessionId, coachId, coachUsername: 'coach' })
    })

    it('bells the athlete when their coach hands them a block, and the coach when the athlete leaves', async () => {
        const { coachAccess, coachId, athlete } = await linkedCoachAndAthlete()
        const exerciseId = await anExerciseId(coachAccess)

        const created = await gql(
            `mutation { createAthleteMesocycle(athleteId: "${athlete.userId}", input: { name: "Peaking Block", microcycles: [{ days: [{ dayOffset: 0, exercises: [{ exerciseId: "${exerciseId}", sets: [{ plannedReps: 3 }] }] }] }] }) { id } }`,
            coachAccess,
        )
        const mesocycleId: string = created.body.data.createAthleteMesocycle.id

        const assigned = await bellFor(athlete.access, 'mesocycle_assigned')
        expect(assigned).toMatchObject({ mesocycleId, name: 'Peaking Block', coachId })

        // The athlete walks away: the coach is the one who gets told.
        await gql(`mutation { leaveCoach(coachId: "${coachId}") }`, athlete.access)

        const unlinked = await bellFor(coachAccess, 'athlete_unlinked')
        expect(unlinked).toMatchObject({ athleteId: athlete.userId, athleteUsername: 'athlete' })
    })
})
