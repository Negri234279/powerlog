import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrateUpTo } from '../../../../tests/helpers/migrate-up-to'

// `0062` turns every planned target into a `_min`/`_max` range: it renames the
// existing column to `_min` and backfills `_max` from it. Production will migrate
// straight through to HEAD in one `db:migrate`, over tables that already hold
// templates, mesocycles and sessions — so what has to be proved is not that the
// migration APPLIES (the other integration suites cover that on empty tables) but
// that it PRESERVES the rows already there: every value copied into both bounds,
// every NULL still NULL.
//
// The rename is one-way, so it can only be applied ONCE against the shared
// container: all the legacy fixtures are written in the old shape first, `0062`
// runs a single time, and each test then asserts on a row captured up front.
const BEFORE = '0061_bored_wraith'
const MIGRATION = './drizzle/0062_planned_ranges.sql'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase
let exerciseId: string

// Row ids captured before the migration, asserted on after it.
let sessionPlanned: string
let sessionPartial: string
let templatePlanned: string

async function applyMigration(): Promise<void> {
    const file = await readFile(MIGRATION, 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
        const trimmed = statement.trim()
        if (trimmed) await db.execute(sql.raw(trimmed))
    }
}

/**
 * Insert a session set in the PRE-0062 shape (one column per planned target).
 * Raw SQL on purpose — the Drizzle schema describes HEAD, and this database is
 * deliberately held at 0061.
 */
async function legacySessionSet(planned: {
    weightKg: number | null
    reps: number | null
    rpe: number | null
    rir: number | null
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
        INSERT INTO workout_sets (id, entry_id, "order", planned_weight_kg, planned_reps, planned_rpe, planned_rir)
        VALUES (${setId}, ${entryId}, 1, ${planned.weightKg}, ${planned.reps}, ${planned.rpe}, ${planned.rir})
    `)

    return setId
}

/** Insert a template set in the PRE-0062 shape. Weights/reps are `planned_*`; intensity is bare `rpe`/`rir`. */
async function legacyTemplateSet(planned: {
    weightKg: number | null
    reps: number | null
    rpe: number | null
    rir: number | null
}): Promise<string> {
    const templateId = randomUUID()
    const exerciseRowId = randomUUID()
    const setId = randomUUID()

    await db.execute(sql`
        INSERT INTO workout_templates (id, owner_id, name) VALUES (${templateId}, ${randomUUID()}, 'Legacy')
    `)
    await db.execute(sql`
        INSERT INTO workout_template_exercises (id, template_id, exercise_id, "order")
        VALUES (${exerciseRowId}, ${templateId}, ${exerciseId}, 1)
    `)
    await db.execute(sql`
        INSERT INTO workout_template_sets (id, template_exercise_id, "order", planned_weight_kg, planned_reps, rpe, rir)
        VALUES (${setId}, ${exerciseRowId}, 1, ${planned.weightKg}, ${planned.reps}, ${planned.rpe}, ${planned.rir})
    `)

    return setId
}

interface SessionSetBounds extends Record<string, number | null> {
    planned_weight_kg_min: number | null
    planned_weight_kg_max: number | null
    planned_rir_min: number | null
    planned_rir_max: number | null
}

interface TemplateSetBounds extends Record<string, number | null> {
    rpe_min: number | null
    rpe_max: number | null
}

async function sessionSetById(id: string): Promise<SessionSetBounds> {
    const result = await db.execute<SessionSetBounds>(sql`
        SELECT planned_weight_kg_min, planned_weight_kg_max, planned_reps_min, planned_reps_max,
               planned_rpe_min, planned_rpe_max, planned_rir_min, planned_rir_max
        FROM workout_sets WHERE id = ${id}
    `)

    return result.rows[0]!
}

async function templateSetById(id: string): Promise<TemplateSetBounds> {
    const result = await db.execute<TemplateSetBounds>(sql`
        SELECT planned_weight_kg_min, planned_weight_kg_max, planned_reps_min, planned_reps_max,
               rpe_min, rpe_max, rir_min, rir_max
        FROM workout_template_sets WHERE id = ${id}
    `)

    return result.rows[0]!
}

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool)
    await migrateUpTo(db, BEFORE)

    const catalog = await db.execute<{ id: string }>(sql`SELECT id FROM exercises LIMIT 1`)
    exerciseId = catalog.rows[0]!.id

    // Every legacy shape that has to survive, written before the one-way migration.
    sessionPlanned = await legacySessionSet({ weightKg: 100, reps: 5, rpe: 8, rir: null })
    // RPE planned but no RIR: the RIR pair must not be conjured from nothing.
    sessionPartial = await legacySessionSet({ weightKg: null, reps: null, rpe: 8, rir: null })
    templatePlanned = await legacyTemplateSet({ weightKg: 90, reps: 8, rpe: null, rir: 2 })

    await applyMigration()
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

describe('0062 planned-ranges migration (integration)', () => {
    it('copies every session-set target into both bounds of its range', async () => {
        const set = await sessionSetById(sessionPlanned)

        expect(set).toMatchObject({
            planned_weight_kg_min: 100,
            planned_weight_kg_max: 100,
            planned_reps_min: 5,
            planned_reps_max: 5,
            planned_rpe_min: 8,
            planned_rpe_max: 8,
        })
    })

    it('leaves an unplanned session-set target NULL on both bounds', async () => {
        const set = await sessionSetById(sessionPartial)

        expect(set.planned_weight_kg_min).toBeNull()
        expect(set.planned_weight_kg_max).toBeNull()
        expect(set.planned_rir_min).toBeNull()
        expect(set.planned_rir_max).toBeNull()
    })

    it('copies every template-set target into both bounds (bare rpe/rir columns)', async () => {
        const set = await templateSetById(templatePlanned)

        expect(set).toMatchObject({
            planned_weight_kg_min: 90,
            planned_weight_kg_max: 90,
            planned_reps_min: 8,
            planned_reps_max: 8,
            rir_min: 2,
            rir_max: 2,
        })
        // No RPE was planned, so neither bound may be invented.
        expect(set.rpe_min).toBeNull()
        expect(set.rpe_max).toBeNull()
    })
})
