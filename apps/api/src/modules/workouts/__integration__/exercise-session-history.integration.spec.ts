import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { WorkoutSessionMother } from '../../../../tests/mothers/workouts'
import { RepsVO } from '../domain/value-objects/reps.vo'
import { WeightVO } from '../domain/value-objects/weight.vo'
import { DrizzleExerciseSessionHistoryReadModel } from '../infrastructure/persistence/read-models/drizzle-exercise-session-history.read-model'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let sessions: DrizzleWorkoutSessionRepository
let history: DrizzleExerciseSessionHistoryReadModel
let exA: string
let exB: string

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    sessions = new DrizzleWorkoutSessionRepository(db)
    history = new DrizzleExerciseSessionHistoryReadModel(db)
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

describe('Exercise session history (integration)', () => {
    it('returns past completed sessions of the exercise, newest first, with their performed sets', async () => {
        const userA = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(exA, { userId: userA, performedAt: new Date('2026-01-10T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(exA, { userId: userA, performedAt: new Date('2026-02-20T00:00:00Z') }),
        )

        const rows = await history.forExercise({ userId: userA, exerciseId: exA, limit: 3 })

        expect(rows.map((r) => r.performedAt.toISOString())).toEqual([
            '2026-02-20T00:00:00.000Z',
            '2026-01-10T00:00:00.000Z',
        ])
        // withTree logs 102.5×5 @8 (top) then 90×8 RIR2 (backoff), in entry/set order.
        expect(rows[0]!.sets).toEqual([
            { weightKg: 102.5, reps: 5, rpe: 8, rir: null, e1rmKg: expect.closeTo(119.58, 2) },
            { weightKg: 90, reps: 8, rpe: null, rir: 2, e1rmKg: expect.closeTo(114, 2) },
        ])
    })

    it('excludes the given session and other exercises, and is user-scoped', async () => {
        const userA = randomUUID()
        const userB = randomUUID()
        const current = WorkoutSessionMother.withTree(exA, {
            userId: userA,
            performedAt: new Date('2026-03-01T00:00:00Z'),
        })
        await sessions.save(current)
        await sessions.save(
            WorkoutSessionMother.withTree(exB, { userId: userA, performedAt: new Date('2026-02-01T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(exA, { userId: userB, performedAt: new Date('2026-02-01T00:00:00Z') }),
        )

        const rows = await history.forExercise({
            userId: userA,
            exerciseId: exA,
            excludeSessionId: current.id,
            limit: 3,
        })

        expect(rows).toEqual([])
    })

    it('ignores planned (not completed) sessions and honours the limit', async () => {
        const userA = randomUUID()
        for (const day of ['2026-01-05', '2026-01-12', '2026-01-19']) {
            await sessions.save(
                WorkoutSessionMother.withTree(exA, { userId: userA, performedAt: new Date(`${day}T00:00:00Z`) }),
            )
        }
        // A planned session (never `complete()`d) must not appear even though it
        // logs exA with a real performed set.
        const now = new Date('2026-01-26T00:00:00Z')
        const planned = WorkoutSessionMother.empty({ userId: userA, performedAt: now })
        const entry = planned.addEntry({ id: randomUUID(), exerciseId: exA, notes: null }, now)
        planned.addSet(entry.id, { id: randomUUID(), weight: WeightVO.create(80), reps: RepsVO.create(5) }, now)
        await sessions.save(planned)

        const rows = await history.forExercise({ userId: userA, exerciseId: exA, limit: 2 })

        expect(rows).toHaveLength(2)
        expect(rows.map((r) => r.performedAt.toISOString())).toEqual([
            '2026-01-19T00:00:00.000Z',
            '2026-01-12T00:00:00.000Z',
        ])
    })
})
