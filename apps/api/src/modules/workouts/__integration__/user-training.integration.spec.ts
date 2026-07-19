import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { WorkoutSessionMother } from '../../../../tests/mothers/workouts'
import { DrizzleUserTrainingReadModel } from '../infrastructure/persistence/read-models/drizzle-user-training.read-model'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let sessions: DrizzleWorkoutSessionRepository
let training: DrizzleUserTrainingReadModel
let exA: string
let exB: string

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    sessions = new DrizzleWorkoutSessionRepository(db)
    training = new DrizzleUserTrainingReadModel(db)
    const catalog = await db.select().from(schema.exercises).limit(2)
    exA = catalog[0]!.id
    exB = catalog[1]!.id
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE workout_sessions RESTART IDENTITY CASCADE`)
})

describe('User training summary (integration)', () => {
    it('aggregates a user’s sessions, sets and exercises, scoped to that user', async () => {
        const userA = randomUUID()
        const userB = randomUUID()
        const recent = new Date()

        // userA: two completed sessions (exA old, exB recent) + one planned session.
        await sessions.save(
            WorkoutSessionMother.withTree(exA, { userId: userA, performedAt: new Date('2026-01-15T00:00:00Z') }),
        )
        await sessions.save(WorkoutSessionMother.withTree(exB, { userId: userA, performedAt: recent }))
        await sessions.save(
            WorkoutSessionMother.empty({
                userId: userA,
                status: 'planned',
                performedAt: new Date('2026-02-01T00:00:00Z'),
            }),
        )
        // userB trains exA too — must not leak into userA's figures.
        await sessions.save(WorkoutSessionMother.withTree(exA, { userId: userB }))

        const summary = await training.read(userA)

        expect(summary.sessions).toBe(3)
        expect(summary.completedSessions).toBe(2)
        expect(summary.sets).toBe(4) // 2 per withTree × 2
        expect(summary.distinctExercises).toBe(2) // exA + exB
        expect(summary.lastSessionAt?.getTime()).toBe(recent.getTime())
        expect(summary.sessionsLast30Days).toBe(1) // only the recent one
    })

    it('returns zeroes and a null last-session for a user who has never trained', async () => {
        const summary = await training.read(randomUUID())

        expect(summary).toEqual({
            sessions: 0,
            completedSessions: 0,
            sets: 0,
            distinctExercises: 0,
            lastSessionAt: null,
            sessionsLast30Days: 0,
        })
    })
})
