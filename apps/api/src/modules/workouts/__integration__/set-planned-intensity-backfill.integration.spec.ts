import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { eq, sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'

const MIGRATION = './drizzle/0050_nifty_mongu.sql'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let backfill: string
let exerciseId: string

/**
 * Pull the backfill out of the migration that ships, so this exercises the real
 * statement rather than a copy of it that can drift away from it.
 */
async function readBackfill(): Promise<string> {
    const sqlFile = await readFile(MIGRATION, 'utf8')
    const update = sqlFile
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .find((statement) => statement.includes('UPDATE "workout_sets"'))

    if (!update) throw new Error(`No backfill UPDATE found in ${MIGRATION}`)

    return update
}

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    backfill = await readBackfill()
    const [exercise] = await db.select().from(schema.exercises).limit(1)
    exerciseId = exercise!.id
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE workout_sessions RESTART IDENTITY CASCADE`)
})

/** Insert a set in the PRE-migration shape: one rpe/rir column doing both jobs. */
async function legacySet(fields: {
    weightKg: number | null
    reps: number | null
    rpe?: number | null
    rir?: number | null
}): Promise<string> {
    const sessionId = randomUUID()
    const entryId = randomUUID()
    const setId = randomUUID()

    await db.insert(schema.workoutSessions).values({
        id: sessionId,
        userId: randomUUID(),
        status: 'planned',
        performedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    await db.insert(schema.workoutExerciseEntries).values({ id: entryId, sessionId, exerciseId, order: 1 })
    await db.insert(schema.workoutSets).values({
        id: setId,
        entryId,
        order: 1,
        plannedWeightKg: 100,
        plannedReps: 5,
        weightKg: fields.weightKg,
        reps: fields.reps,
        rpe: fields.rpe ?? null,
        rir: fields.rir ?? null,
    })

    return setId
}

async function setById(id: string) {
    const [row] = await db.select().from(schema.workoutSets).where(eq(schema.workoutSets.id, id))
    return row!
}

describe('0050 planned-intensity backfill (integration)', () => {
    it('moves the target intensity off a set that was never performed', async () => {
        // What materializing a template used to produce: targets only.
        const setId = await legacySet({ weightKg: null, reps: null, rpe: 8 })

        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set.plannedRpe).toBe(8)
        expect(set.rpe).toBeNull()
    })

    it('leaves the intensity of a performed set alone — that one is real', async () => {
        const setId = await legacySet({ weightKg: 100, reps: 5, rpe: 9 })

        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set.rpe).toBe(9)
        expect(set.plannedRpe).toBeNull()
    })

    it('moves RIR the same way', async () => {
        const setId = await legacySet({ weightKg: null, reps: null, rir: 2 })

        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set.plannedRir).toBe(2)
        expect(set.rir).toBeNull()
    })

    it('is idempotent — a second run cannot wipe what the first one moved', async () => {
        const setId = await legacySet({ weightKg: null, reps: null, rpe: 8 })

        await db.execute(sql.raw(backfill))
        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set.plannedRpe).toBe(8)
    })

    it('leaves a set with no intensity at all untouched', async () => {
        const setId = await legacySet({ weightKg: null, reps: null })

        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set).toMatchObject({ plannedRpe: null, plannedRir: null, rpe: null, rir: null, outcome: null })
    })
})
