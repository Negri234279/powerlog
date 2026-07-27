import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../database/schema'
import { DrizzlePushSubscriptionStore } from '../infrastructure/drizzle-push-subscription.store'
import type { PushSubscriptionInput } from '../push.types'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let store: DrizzlePushSubscriptionStore

function makeInput(overrides: Partial<PushSubscriptionInput> = {}): PushSubscriptionInput {
    return {
        userId: randomUUID(),
        endpoint: `https://push.example.com/${randomUUID()}`,
        p256dh: 'p256dh-key',
        auth: 'auth-secret',
        locale: 'en',
        userAgent: 'test-agent',
        ...overrides,
    }
}

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    store = new DrizzlePushSubscriptionStore(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE push_subscriptions RESTART IDENTITY CASCADE`)
})

describe('Push subscription store (integration)', () => {
    it('saves a subscription and finds it by user', async () => {
        const input = makeInput()
        await store.save(input)

        const found = await store.findByUsers([input.userId])

        expect(found).toHaveLength(1)
        expect(found[0]).toMatchObject({ endpoint: input.endpoint, userId: input.userId, locale: 'en' })
    })

    it('upserts by endpoint: a re-register reassigns the user and keeps a single row', async () => {
        const endpoint = 'https://push.example.com/shared-device'
        const first = randomUUID()
        const second = randomUUID()

        await store.save(makeInput({ userId: first, endpoint, locale: 'en' }))
        await store.save(makeInput({ userId: second, endpoint, locale: 'es' }))

        // The device now belongs to the second user; the first no longer has it.
        expect(await store.findByUsers([first])).toHaveLength(0)
        const found = await store.findByUsers([second])
        expect(found).toHaveLength(1)
        expect(found[0]).toMatchObject({ endpoint, locale: 'es' })
    })

    it('returns every device of a user (one row per endpoint)', async () => {
        const userId = randomUUID()
        await store.save(makeInput({ userId, endpoint: 'https://push.example.com/phone' }))
        await store.save(makeInput({ userId, endpoint: 'https://push.example.com/laptop' }))
        await store.save(makeInput()) // someone else

        const found = await store.findByUsers([userId])

        expect(found.map((r) => r.endpoint).sort()).toEqual([
            'https://push.example.com/laptop',
            'https://push.example.com/phone',
        ])
    })

    it('removes by endpoint scoped to the owner (a foreign user cannot delete it)', async () => {
        const owner = randomUUID()
        const endpoint = 'https://push.example.com/owned'
        await store.save(makeInput({ userId: owner, endpoint }))

        expect(await store.removeByEndpoint(randomUUID(), endpoint)).toBe(false)
        expect(await store.findByUsers([owner])).toHaveLength(1)

        expect(await store.removeByEndpoint(owner, endpoint)).toBe(true)
        expect(await store.findByUsers([owner])).toHaveLength(0)
    })

    it('prunes a dead endpoint unconditionally', async () => {
        const userId = randomUUID()
        const endpoint = 'https://push.example.com/dead'
        await store.save(makeInput({ userId, endpoint }))

        await store.deleteByEndpoint(endpoint)

        expect(await store.findByUsers([userId])).toHaveLength(0)
    })

    it('returns an empty list for no users without hitting the db', async () => {
        expect(await store.findByUsers([])).toEqual([])
    })
})
