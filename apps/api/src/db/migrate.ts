import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

import { env } from '../config/env'

/**
 * Standalone migration runner executed by the container entrypoint *before* the
 * API boots. Uses the programmatic Drizzle migrator (from `drizzle-orm`, a
 * production dependency) so it works in the minimal production image without
 * `drizzle-kit`.
 *
 * Idempotent: the migrator compares the committed migrations (`drizzle/`) against
 * the `__drizzle_migrations` table and applies only what's pending — safe to run
 * on every container start. Watchtower recreates the container whenever the
 * image tag changes; if the new image ships new migrations they get applied,
 * otherwise this is a no-op.
 *
 * A Postgres advisory lock serialises concurrent runs (multiple replicas or
 * overlapping restarts) so only one process migrates at a time.
 */

// Arbitrary but stable key — every migrator process uses the same one, so they
// queue on `pg_advisory_lock` instead of racing.
const MIGRATION_LOCK_KEY = 4_011_989

async function run(): Promise<void> {
    const pool = new Pool({ connectionString: env.DATABASE_URL })

    try {
        await pool.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY])

        try {
            console.log('[migrate] applying pending migrations…')
            await migrate(drizzle(pool), { migrationsFolder: './drizzle' })
            console.log('[migrate] database up to date.')
        } finally {
            await pool.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY])
        }
    } finally {
        await pool.end()
    }
}

run().catch((error: unknown) => {
    console.error('[migrate] failed:', error)
    process.exit(1)
})
