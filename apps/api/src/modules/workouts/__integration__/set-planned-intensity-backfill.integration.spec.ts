import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { migrateUpTo } from '../../../../tests/helpers/migrate-up-to'

// Anchored to 0050, not HEAD: the migration under test moves target intensities
// into columns that `0062` later renames to `_min`, so the shipped statement
// would fail on a column that no longer exists at HEAD. The backfill has still
// not run in production, which is why the coverage is worth pinning, not dropping.
const MIGRATION_TAG = '0050_nifty_mongu'
const MIGRATION = `./drizzle/${MIGRATION_TAG}.sql`

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase
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
    db = drizzle(pool)
    await migrateUpTo(db, MIGRATION_TAG)
    backfill = await readBackfill()
    const catalog = await db.execute<{ id: string }>(sql`SELECT id FROM exercises LIMIT 1`)
    exerciseId = catalog.rows[0]!.id
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE workout_sessions RESTART IDENTITY CASCADE`)
})

/**
 * Insert a set in the PRE-migration shape: one rpe/rir column doing both jobs.
 * Raw SQL on purpose — the Drizzle schema describes HEAD, and this database is
 * deliberately standing still at `0050`.
 */
async function legacySet(fields: {
    weightKg: number | null
    reps: number | null
    rpe?: number | null
    rir?: number | null
}): Promise<string> {
    const sessionId = randomUUID()
    const entryId = randomUUID()
    const setId = randomUUID()

    await db.execute(sql`
        INSERT INTO workout_sessions (id, user_id, status, performed_at)
        VALUES (${sessionId}, ${randomUUID()}, 'planned', ${new Date('2026-01-01T00:00:00.000Z')})
    `)
    await db.execute(sql`
        INSERT INTO workout_exercise_entries (id, session_id, exercise_id, "order")
        VALUES (${entryId}, ${sessionId}, ${exerciseId}, 1)
    `)
    await db.execute(sql`
        INSERT INTO workout_sets (id, entry_id, "order", planned_weight_kg, planned_reps, weight_kg, reps, rpe, rir)
        VALUES (${setId}, ${entryId}, 1, 100, 5, ${fields.weightKg}, ${fields.reps},
                ${fields.rpe ?? null}, ${fields.rir ?? null})
    `)

    return setId
}

interface SetRow extends Record<string, unknown> {
    planned_rpe: number | null
    planned_rir: number | null
    rpe: number | null
    rir: number | null
    outcome: string | null
}

async function setById(id: string): Promise<SetRow> {
    const result = await db.execute<SetRow>(sql`
        SELECT planned_rpe, planned_rir, rpe, rir, outcome FROM workout_sets WHERE id = ${id}
    `)

    return result.rows[0]!
}

describe('0050 planned-intensity backfill (integration)', () => {
    it('moves the target intensity off a set that was never performed', async () => {
        // What materializing a template used to produce: targets only.
        const setId = await legacySet({ weightKg: null, reps: null, rpe: 8 })

        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set.planned_rpe).toBe(8)
        expect(set.rpe).toBeNull()
    })

    it('leaves the intensity of a performed set alone — that one is real', async () => {
        const setId = await legacySet({ weightKg: 100, reps: 5, rpe: 9 })

        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set.rpe).toBe(9)
        expect(set.planned_rpe).toBeNull()
    })

    it('moves RIR the same way', async () => {
        const setId = await legacySet({ weightKg: null, reps: null, rir: 2 })

        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set.planned_rir).toBe(2)
        expect(set.rir).toBeNull()
    })

    it('is idempotent — a second run cannot wipe what the first one moved', async () => {
        const setId = await legacySet({ weightKg: null, reps: null, rpe: 8 })

        await db.execute(sql.raw(backfill))
        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set.planned_rpe).toBe(8)
    })

    it('leaves a set with no intensity at all untouched', async () => {
        const setId = await legacySet({ weightKg: null, reps: null })

        await db.execute(sql.raw(backfill))

        const set = await setById(setId)
        expect(set).toMatchObject({ planned_rpe: null, planned_rir: null, rpe: null, rir: null, outcome: null })
    })
})
