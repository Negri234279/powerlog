import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { WorkoutSessionMother } from '../../../../tests/mothers/workouts'
import { DrizzleWorkoutHistoryReadModel } from '../infrastructure/persistence/read-models/drizzle-workout-history.read-model'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let sessions: DrizzleWorkoutSessionRepository
let history: DrizzleWorkoutHistoryReadModel
let exId: string

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    sessions = new DrizzleWorkoutSessionRepository(db)
    history = new DrizzleWorkoutHistoryReadModel(db)
    const [exercise] = await db.select().from(schema.exercises).limit(1)
    exId = exercise!.id
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE workout_sessions RESTART IDENTITY CASCADE`)
})

describe('Workout history (integration)', () => {
    it('lists newest-first with rollups and paginates via cursor', async () => {
        const userId = randomUUID()
        // Three completed sessions across three months (each: 1 exercise, 2 sets, 1232.5 kg).
        await sessions.save(
            WorkoutSessionMother.withTree(exId, { userId, performedAt: new Date('2026-01-10T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(exId, { userId, performedAt: new Date('2026-02-10T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(exId, { userId, performedAt: new Date('2026-03-10T00:00:00Z') }),
        )

        const first = await history.list({ userId, limit: 2 })
        expect(first.hasNextPage).toBe(true)
        expect(first.items.map((s) => s.performedAt.toISOString())).toEqual([
            '2026-03-10T00:00:00.000Z',
            '2026-02-10T00:00:00.000Z',
        ])
        expect(first.items[0]).toMatchObject({
            status: 'completed',
            exerciseCount: 1,
            setCount: 2,
            totalVolumeKg: 1232.5,
        })

        const last = first.items[first.items.length - 1]!
        const second = await history.list({
            userId,
            limit: 2,
            cursor: { performedAt: last.performedAt, id: last.id },
        })
        expect(second.hasNextPage).toBe(false)
        expect(second.items.map((s) => s.performedAt.toISOString())).toEqual(['2026-01-10T00:00:00.000Z'])
    })

    it('filters by status', async () => {
        const userId = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(exId, { userId, performedAt: new Date('2026-02-10T00:00:00Z') }),
        )
        await sessions.save(WorkoutSessionMother.empty({ userId, performedAt: new Date('2026-03-10T00:00:00Z') }))

        const planned = await history.list({ userId, limit: 10, status: 'planned' })
        expect(planned.items.map((s) => s.status)).toEqual(['planned'])

        const completed = await history.list({ userId, limit: 10, status: 'completed' })
        expect(completed.items.map((s) => s.status)).toEqual(['completed'])
    })

    it('filters by date range', async () => {
        const userId = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(exId, { userId, performedAt: new Date('2026-01-10T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(exId, { userId, performedAt: new Date('2026-06-10T00:00:00Z') }),
        )

        const recent = await history.list({ userId, limit: 10, from: new Date('2026-03-01T00:00:00Z') })
        expect(recent.items.map((s) => s.performedAt.toISOString())).toEqual(['2026-06-10T00:00:00.000Z'])
    })

    it('filters by exercise', async () => {
        const userId = randomUUID()
        const [a, b] = await db.select().from(schema.exercises).limit(2)
        await sessions.save(
            WorkoutSessionMother.withTree(a!.id, { userId, performedAt: new Date('2026-02-10T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(b!.id, { userId, performedAt: new Date('2026-03-10T00:00:00Z') }),
        )

        const onlyA = await history.list({ userId, limit: 10, exerciseId: a!.id })
        expect(onlyA.items.map((s) => s.performedAt.toISOString())).toEqual(['2026-02-10T00:00:00.000Z'])
        // Counts/volume stay intact under the EXISTS filter (one exercise, two sets).
        expect(onlyA.items[0]).toMatchObject({ exerciseCount: 1, setCount: 2 })
    })

    it('filters by notes text (case-insensitive substring)', async () => {
        const userId = randomUUID()
        await sessions.save(
            WorkoutSessionMother.empty({
                userId,
                performedAt: new Date('2026-02-10T00:00:00Z'),
                notes: 'Lower body, week 4',
            }),
        )
        await sessions.save(
            WorkoutSessionMother.empty({
                userId,
                performedAt: new Date('2026-03-10T00:00:00Z'),
                notes: 'Upper push day',
            }),
        )

        const lower = await history.list({ userId, limit: 10, query: 'lower' })
        expect(lower.items.map((s) => s.notes)).toEqual(['Lower body, week 4'])
    })

    it('scopes to the user and reports zero rollups for an empty session', async () => {
        const userId = randomUUID()
        await sessions.save(WorkoutSessionMother.empty({ userId, performedAt: new Date('2026-04-10T00:00:00Z') }))
        await sessions.save(WorkoutSessionMother.withTree(exId, { userId: randomUUID() })) // other user

        const page = await history.list({ userId, limit: 10 })
        expect(page.items).toHaveLength(1)
        expect(page.items[0]).toMatchObject({ exerciseCount: 0, setCount: 0, totalVolumeKg: 0 })
    })
})
