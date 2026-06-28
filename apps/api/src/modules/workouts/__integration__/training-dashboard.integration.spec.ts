import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { eq, sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { WorkoutSessionMother } from '../../../../tests/mothers/workouts'
import { DrizzleTrainingDashboardReadModel } from '../infrastructure/persistence/read-models/drizzle-training-dashboard.read-model'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let sessions: DrizzleWorkoutSessionRepository
let dashboard: DrizzleTrainingDashboardReadModel
let squatId: string

// withTree logs two sets: 102.5×5 (rpe 8) and 90×8. Volume 1232.5 kg/session;
// best Epley e1RM = 102.5·(1+5/30) = 119.58 kg.
const E1RM = 119.58
const VOLUME = 1232.5

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    sessions = new DrizzleWorkoutSessionRepository(db)
    dashboard = new DrizzleTrainingDashboardReadModel(db)
    const [squat] = await db.select().from(schema.exercises).where(eq(schema.exercises.category, 'squat')).limit(1)
    squatId = squat!.id
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE workout_sessions RESTART IDENTITY CASCADE`)
})

describe('Training dashboard (integration)', () => {
    it('summarises KPIs and the best squat e1RM', async () => {
        const userId = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(squatId, { userId, performedAt: new Date('2026-01-05T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(squatId, { userId, performedAt: new Date('2026-02-05T00:00:00Z') }),
        )

        const summary = await dashboard.summary({ userId })

        expect(summary).toMatchObject({
            sessions: 2,
            trainingDays: 2,
            totalSets: 4,
            totalReps: 26,
            totalVolumeKg: VOLUME * 2,
            avgRpe: 8,
            distinctExercises: 1,
            bestSquatE1rmKg: E1RM,
            bestBenchE1rmKg: null,
            bestDeadliftE1rmKg: null,
        })
    })

    it('buckets volume by week', async () => {
        const userId = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(squatId, { userId, performedAt: new Date('2026-01-05T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(squatId, { userId, performedAt: new Date('2026-02-05T00:00:00Z') }),
        )

        const series = await dashboard.volumeSeries({ userId })

        expect(series).toHaveLength(2)
        expect(series.map((b) => ({ volume: b.totalVolumeKg, sets: b.totalSets, sessions: b.sessions }))).toEqual([
            { volume: VOLUME, sets: 2, sessions: 1 },
            { volume: VOLUME, sets: 2, sessions: 1 },
        ])
        // Ascending order by week.
        expect(series[0]!.bucketStart.getTime()).toBeLessThan(series[1]!.bucketStart.getTime())
    })

    it('returns one e1RM point per session for the exercise, oldest first', async () => {
        const userId = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(squatId, { userId, performedAt: new Date('2026-02-05T00:00:00Z') }),
        )
        await sessions.save(
            WorkoutSessionMother.withTree(squatId, { userId, performedAt: new Date('2026-01-05T00:00:00Z') }),
        )

        const points = await dashboard.strengthSeries({ userId, exerciseId: squatId })

        expect(points.map((p) => p.performedAt.toISOString())).toEqual([
            '2026-01-05T00:00:00.000Z',
            '2026-02-05T00:00:00.000Z',
        ])
        expect(points.every((p) => p.e1rmKg === E1RM)).toBe(true)
    })

    it('distributes volume by muscle/category and breaks down RPE', async () => {
        const userId = randomUUID()
        await sessions.save(
            WorkoutSessionMother.withTree(squatId, { userId, performedAt: new Date('2026-01-05T00:00:00Z') }),
        )

        const dist = await dashboard.distribution({ userId })

        expect(dist.byCategory).toEqual([{ key: 'squat', totalVolumeKg: VOLUME, totalSets: 2 }])
        expect(dist.byMuscle).toHaveLength(1)
        expect(dist.byMuscle[0]).toMatchObject({ totalVolumeKg: VOLUME, totalSets: 2 })
        // The top set recorded RPE 8; the backoff set recorded RIR 2 (never both).
        expect(dist.rpe).toEqual([{ value: 8, sets: 1 }])
        expect(dist.rir).toEqual([{ value: 2, sets: 1 }])
    })

    it('scopes to the user and reports zeros for an empty range', async () => {
        const userId = randomUUID()
        await sessions.save(WorkoutSessionMother.withTree(squatId, { userId: randomUUID() })) // other user

        const summary = await dashboard.summary({ userId })

        expect(summary).toMatchObject({ sessions: 0, totalSets: 0, totalVolumeKg: 0, bestSquatE1rmKg: null })
    })
})
