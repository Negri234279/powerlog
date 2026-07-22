import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { eq, sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { WorkoutSessionMother } from '../../../../tests/mothers/workouts'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let sessions: DrizzleWorkoutSessionRepository
let exerciseId: string

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    sessions = new DrizzleWorkoutSessionRepository(db)
    const [exercise] = await db.select().from(schema.exercises).limit(1)
    exerciseId = exercise!.id
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    // Keep the seeded catalog; only clear sessions (cascade clears entries/sets).
    await db.execute(sql`TRUNCATE TABLE workout_sessions RESTART IDENTITY CASCADE`)
})

describe('WorkoutSession persistence (integration)', () => {
    it('round-trips the full tree with planned/actual values and derived e1RM', async () => {
        const userId = randomUUID()
        const session = WorkoutSessionMother.withTree(exerciseId, { userId })
        await sessions.save(session)

        const found = await sessions.findById(session.id)
        expect(found).not.toBeNull()
        expect(found!.userId).toBe(userId)
        expect(found!.status).toBe('completed')
        expect(found!.entries).toHaveLength(1)

        const [entry] = found!.entries
        expect(entry!.exerciseId).toBe(exerciseId)
        expect(entry!.sets.map((s) => s.order)).toEqual([1, 2])

        const [top, backoff] = entry!.sets
        expect(top!.plannedWeight?.min.value).toBe(100)
        expect(top!.weight?.value).toBe(102.5)
        expect(top!.reps?.value).toBe(5)
        expect(top!.rpe?.value).toBe(8)
        expect(top!.e1rmKg).toBeCloseTo(119.58, 2)
        expect(backoff!.weight?.value).toBe(90)
        expect(backoff!.e1rmKg).toBe(114)
        expect(backoff!.notes).toBe('backoff')
    })

    it('replaces children on re-save (set removed) and reindexes order', async () => {
        const session = WorkoutSessionMother.withTree(exerciseId, { userId: randomUUID() })
        await sessions.save(session)

        const [entry] = session.entries
        const [firstSet] = entry!.sets
        session.removeSet(entry!.id, firstSet!.id, new Date())
        await sessions.save(session)

        const found = await sessions.findById(session.id)
        expect(found!.entries[0]!.sets).toHaveLength(1)
        expect(found!.entries[0]!.sets[0]!.order).toBe(1)
    })

    it('deletes the session and cascades to entries and sets', async () => {
        const session = WorkoutSessionMother.withTree(exerciseId, { userId: randomUUID() })
        await sessions.save(session)

        await sessions.delete(session.id)

        expect(await sessions.findById(session.id)).toBeNull()
        const entries = await db
            .select()
            .from(schema.workoutExerciseEntries)
            .where(eq(schema.workoutExerciseEntries.sessionId, session.id))
        const remainingSets = await db.select().from(schema.workoutSets)
        expect(entries).toHaveLength(0)
        expect(remainingSets).toHaveLength(0)
    })

    it('deleteAllByUser erases only that userâ€™s sessions (with cascade), keeping others', async () => {
        const userId = randomUUID()
        const other = randomUUID()
        const own = WorkoutSessionMother.withTree(exerciseId, { userId })
        // Owned by another athlete but planned by `userId` (coach) â€” must survive.
        const planned = WorkoutSessionMother.empty({ userId: other, plannedByUserId: userId })
        await sessions.save(own)
        await sessions.save(WorkoutSessionMother.withTree(exerciseId, { userId }))
        await sessions.save(planned)

        await sessions.deleteAllByUser(userId)

        expect(await sessions.findById(own.id)).toBeNull()
        expect(await sessions.findById(planned.id)).not.toBeNull()
        // The deleted sessions' sets cascaded away; only the surviving session's remain.
        const remainingSets = await db.select().from(schema.workoutSets)
        expect(remainingSets).toHaveLength(0)
    })
})
