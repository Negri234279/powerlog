import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { WorkoutSessionMother } from '../../../../tests/mothers/workouts'
import { DrizzleAthleteStrengthReadModel } from '../infrastructure/persistence/read-models/drizzle-athlete-strength.read-model'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let sessions: DrizzleWorkoutSessionRepository
let strength: DrizzleAthleteStrengthReadModel
let exA: string
let exB: string

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    sessions = new DrizzleWorkoutSessionRepository(db)
    strength = new DrizzleAthleteStrengthReadModel(db)
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

describe('Athlete strength (integration)', () => {
    it('reports the best e1RM per lift, most recently trained first', async () => {
        const userId = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(exA, { userId, performedAt: new Date('2026-01-15T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(exB, { userId, performedAt: new Date('2026-02-20T00:00:00Z') }),
        )

        const rows = await strength.forUser(userId, 30)

        expect(rows).toHaveLength(2)
        // exB was trained later, so it leads. withTree logs 102.5×5 @8 → e1RM 119.58.
        expect(rows[0]?.lastTrainedAt).toEqual(new Date('2026-02-20T00:00:00Z'))
        expect(rows[0]?.e1rmKg).toBeCloseTo(119.58, 2)
    })

    it('honours the limit, dropping the stalest lifts', async () => {
        const userId = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(exA, { userId, performedAt: new Date('2026-01-15T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(exB, { userId, performedAt: new Date('2026-02-20T00:00:00Z') }),
        )

        const rows = await strength.forUser(userId, 1)

        expect(rows).toHaveLength(1)
        expect(rows[0]?.lastTrainedAt).toEqual(new Date('2026-02-20T00:00:00Z'))
    })

    it('never leaks another athlete’s lifts', async () => {
        await sessions.save(WorkoutSessionMother.withTree(exA, { userId: randomUUID() }))

        expect(await strength.forUser(randomUUID(), 30)).toEqual([])
    })

    it('is empty for an athlete who has logged nothing — the model must leave weights null', async () => {
        expect(await strength.forUser(randomUUID(), 30)).toEqual([])
    })
})
