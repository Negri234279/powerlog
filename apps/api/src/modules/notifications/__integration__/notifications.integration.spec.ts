import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { NotificationMother } from '../../../../tests/mothers/notifications'
import * as schema from '../../../database/schema'
import { DrizzleNotificationRepository } from '../infrastructure/persistence/repositories/drizzle-notification.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let repo: DrizzleNotificationRepository

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    repo = new DrizzleNotificationRepository(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE notifications RESTART IDENTITY CASCADE`)
})

describe('Notifications (integration)', () => {
    it('persists payload, lists newest-first and paginates via cursor', async () => {
        const userId = randomUUID()
        for (const [i, day] of ['01', '02', '03'].entries()) {
            await repo.create(
                NotificationMother.create()
                    .withId(randomUUID())
                    .forUser(userId)
                    .withData({ invitationId: `inv-${i}` })
                    .createdAtTime(new Date(`2026-03-${day}T00:00:00Z`))
                    .build(),
            )
        }

        const first = await repo.list({ userId, limit: 2 })
        expect(first.hasNextPage).toBe(true)
        expect(first.items.map((n) => n.createdAt.toISOString())).toEqual([
            '2026-03-03T00:00:00.000Z',
            '2026-03-02T00:00:00.000Z',
        ])
        expect(first.items[0]?.data).toEqual({ invitationId: 'inv-2' })

        const last = first.items[first.items.length - 1]!
        const second = await repo.list({ userId, limit: 2, cursor: { createdAt: last.createdAt, id: last.id } })
        expect(second.hasNextPage).toBe(false)
        expect(second.items.map((n) => n.createdAt.toISOString())).toEqual(['2026-03-01T00:00:00.000Z'])
    })

    it('counts unread scoped to the user', async () => {
        const userId = randomUUID()
        const other = randomUUID()
        await repo.create(NotificationMother.create().withId(randomUUID()).forUser(userId).build())
        await repo.create(NotificationMother.create().withId(randomUUID()).forUser(userId).build())
        await repo.create(NotificationMother.create().withId(randomUUID()).forUser(other).build())

        expect(await repo.countUnread(userId)).toBe(2)
        expect(await repo.countUnread(other)).toBe(1)
    })

    it('marks one read (scoped) and then all the rest', async () => {
        const userId = randomUUID()
        const other = randomUUID()
        const id = randomUUID()
        await repo.create(NotificationMother.create().withId(id).forUser(userId).build())
        await repo.create(NotificationMother.create().withId(randomUUID()).forUser(userId).build())
        await repo.create(NotificationMother.create().withId(randomUUID()).forUser(other).build())

        // A foreign user cannot mark it read.
        expect(await repo.markRead(other, id, new Date())).toBe(false)
        expect(await repo.markRead(userId, id, new Date())).toBe(true)
        expect(await repo.countUnread(userId)).toBe(1)

        expect(await repo.markAllRead(userId, new Date())).toBe(1)
        expect(await repo.countUnread(userId)).toBe(0)
        expect(await repo.countUnread(other)).toBe(1)
    })

    it('deletes one notification, scoped to its owner', async () => {
        const userId = randomUUID()
        const other = randomUUID()
        const id = randomUUID()
        await repo.create(NotificationMother.create().withId(id).forUser(userId).build())
        await repo.create(NotificationMother.create().withId(randomUUID()).forUser(other).build())

        // A foreign user's delete matches no row — it can't be used to probe ids.
        expect(await repo.delete(other, id)).toBe(false)
        expect(await repo.delete(userId, id)).toBe(true)
        expect((await repo.list({ userId, limit: 10 })).items).toEqual([])
        expect((await repo.list({ userId: other, limit: 10 })).items).toHaveLength(1)
    })

    it('clears the read ones and leaves the unread (and other users) alone', async () => {
        const userId = randomUUID()
        const other = randomUUID()
        const readId = randomUUID()
        await repo.create(NotificationMother.create().withId(readId).forUser(userId).build())
        await repo.create(NotificationMother.create().withId(randomUUID()).forUser(userId).build())
        await repo.create(NotificationMother.create().withId(randomUUID()).forUser(other).build())
        await repo.markRead(userId, readId, new Date())
        await repo.markAllRead(other, new Date())

        expect(await repo.deleteRead(userId)).toBe(1)

        const remaining = await repo.list({ userId, limit: 10 })
        expect(remaining.items).toHaveLength(1)
        expect(remaining.items[0]?.readAt).toBeNull()
        expect((await repo.list({ userId: other, limit: 10 })).items).toHaveLength(1)
    })
})
