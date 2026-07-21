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
import { DrizzleExerciseStatsReadModel } from '../infrastructure/persistence/read-models/drizzle-exercise-stats.read-model'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

const NOW = new Date('2026-01-01T00:00:00.000Z')

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let sessions: DrizzleWorkoutSessionRepository
let stats: DrizzleExerciseStatsReadModel
let exA: string
let exB: string

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    sessions = new DrizzleWorkoutSessionRepository(db)
    stats = new DrizzleExerciseStatsReadModel(db)
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

describe('Exercise stats (integration)', () => {
    it('aggregates volume and PRs per exercise, scoped to the user', async () => {
        const userA = randomUUID()
        const userB = randomUUID()
        // userA logs exA (Jan) and exB (Dec); userB logs exA too (must not leak).
        await sessions.save(
            WorkoutSessionMother.withTree(exA, { userId: userA, performedAt: new Date('2026-01-15T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(exB, { userId: userA, performedAt: new Date('2026-12-01T00:00:00Z') }),
        )
        await sessions.save(WorkoutSessionMother.withTree(exA, { userId: userB }))

        const rows = await stats.perExercise({ userId: userA })
        expect(rows).toHaveLength(2)

        const a = rows.find((r) => r.exerciseId === exA)!
        // withTree logs 102.5×5 (top) + 90×8 (backoff): volume 1232.5, e1RM PR 119.58.
        expect(a.totalVolumeKg).toBe(1232.5)
        expect(a.totalSets).toBe(2)
        expect(a.totalReps).toBe(13)
        expect(a.bestE1rmKg).toBeCloseTo(119.58, 2)
        expect(a.heaviestWeightKg).toBe(102.5)
    })

    it('filters by date range', async () => {
        const userA = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(exA, { userId: userA, performedAt: new Date('2026-01-15T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(exB, { userId: userA, performedAt: new Date('2026-12-01T00:00:00Z') }),
        )

        const rows = await stats.perExercise({ userId: userA, from: new Date('2026-06-01T00:00:00Z') })

        expect(rows.map((r) => r.exerciseId)).toEqual([exB])
    })

    it('returns nothing for a user with no logged sets', async () => {
        expect(await stats.perExercise({ userId: randomUUID() })).toEqual([])
    })

    it('counts marked outcomes per exercise, leaving unmarked sets out of both', async () => {
        // Which lift they're missing on is the actionable version of a global
        // failure rate, so the counts have to survive the GROUP BY per exercise.
        const userId = randomUUID()
        const session = WorkoutSessionMother.empty({ userId, performedAt: new Date('2026-01-15T00:00:00Z') })
        const entry = session.addEntry({ id: randomUUID(), exerciseId: exA }, NOW)

        const marked: Array<'success' | 'failed' | null> = ['success', 'success', 'failed', null]
        for (const outcome of marked) {
            const id = randomUUID()
            session.addSet(entry.id, { id, weight: WeightVO.create(100), reps: RepsVO.create(5) }, NOW)
            if (outcome) session.completeSet(entry.id, id, outcome, {}, NOW)
        }
        session.complete(NOW)
        await sessions.save(session)

        const [row] = await stats.perExercise({ userId })

        expect(row).toMatchObject({ exerciseId: exA, totalSets: 4, successSets: 2, failedSets: 1 })
    })
})
