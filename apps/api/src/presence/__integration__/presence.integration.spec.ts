import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../database/schema'
import { DrizzlePresenceStore } from '../infrastructure/drizzle-presence-store'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let store: DrizzlePresenceStore

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    store = new DrizzlePresenceStore(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE user_presence RESTART IDENTITY CASCADE`)
})

describe('Presence store (integration)', () => {
    it('upserts last-seen: insert then update the single row', async () => {
        const userId = randomUUID()
        const first = new Date('2026-05-01T10:00:00.000Z')
        const later = new Date('2026-05-01T12:30:00.000Z')

        await store.touch(userId, first)
        expect(await store.lastSeenAt(userId)).toEqual(first)

        await store.touch(userId, later)
        expect(await store.lastSeenAt(userId)).toEqual(later)
    })

    it('returns null for a user who has never been seen', async () => {
        expect(await store.lastSeenAt(randomUUID())).toBeNull()
    })

    it('reads last-seen in bulk, omitting users without a row', async () => {
        const seen = randomUUID()
        const unseen = randomUUID()
        const at = new Date('2026-05-01T09:00:00.000Z')
        await store.touch(seen, at)

        const map = await store.lastSeenOf([seen, unseen])

        expect(map.get(seen)).toEqual(at)
        expect(map.has(unseen)).toBe(false)
    })

    it('returns an empty map for an empty id list without hitting the db', async () => {
        expect(await store.lastSeenOf([])).toEqual(new Map())
    })
})
