import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ConversationMother, MessageMother } from '../../../../tests/mothers/chat'
import * as schema from '../../../database/schema'
import { ParticipantStateEntity } from '../domain/entities/participant-state.entity'
import { DrizzleConversationRepository } from '../infrastructure/persistence/repositories/drizzle-conversation.repository'
import { DrizzleMessageRepository } from '../infrastructure/persistence/repositories/drizzle-message.repository'
import { DrizzleParticipantStateRepository } from '../infrastructure/persistence/repositories/drizzle-participant-state.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let conversations: DrizzleConversationRepository
let messages: DrizzleMessageRepository
let participantStates: DrizzleParticipantStateRepository

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    conversations = new DrizzleConversationRepository(db)
    messages = new DrizzleMessageRepository(db)
    participantStates = new DrizzleParticipantStateRepository(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE chat_conversations RESTART IDENTITY CASCADE`)
    await db.execute(sql`TRUNCATE TABLE coach_athlete RESTART IDENTITY CASCADE`)
})

describe('Chat (integration)', () => {
    it('enforces one conversation per (coach, athlete) pair — createIfAbsent is idempotent', async () => {
        const coachId = randomUUID()
        const athleteId = randomUUID()
        const first = ConversationMother.create().withId(randomUUID()).between(coachId, athleteId).build()
        const second = ConversationMother.create().withId(randomUUID()).between(coachId, athleteId).build()

        const created = await conversations.createIfAbsent(first)
        const again = await conversations.createIfAbsent(second)

        // The second create conflicts on the pair unique and returns the first row.
        expect(again.id).toBe(created.id)
        expect(await conversations.findByPair(coachId, athleteId)).not.toBeNull()
    })

    it('lists messages newest-first and paginates via the (createdAt, id) cursor', async () => {
        const coachId = randomUUID()
        const athleteId = randomUUID()
        const conversation = await conversations.createIfAbsent(
            ConversationMother.create().withId(randomUUID()).between(coachId, athleteId).build(),
        )
        for (const [i, day] of ['01', '02', '03'].entries()) {
            await messages.create(
                MessageMother.create()
                    .withId(randomUUID())
                    .in(conversation.id)
                    .from(coachId)
                    .withBody(`m-${i}`)
                    .createdAtTime(new Date(`2026-03-${day}T00:00:00Z`))
                    .build(),
            )
        }

        const first = await messages.list({ conversationId: conversation.id, limit: 2 })
        expect(first.hasNextPage).toBe(true)
        expect(first.items.map((m) => m.body)).toEqual(['m-2', 'm-1'])

        const last = first.items[first.items.length - 1]!
        const second = await messages.list({
            conversationId: conversation.id,
            limit: 2,
            cursor: { createdAt: last.createdAt, id: last.id },
        })
        expect(second.hasNextPage).toBe(false)
        expect(second.items.map((m) => m.body)).toEqual(['m-0'])

        const latest = await messages.latest(conversation.id)
        expect(latest?.body).toBe('m-2')
    })

    it('upserts the per-participant cursor (composite PK) and counts unread + resolves keys', async () => {
        const coachId = randomUUID()
        const athleteId = randomUUID()
        const conversation = await conversations.createIfAbsent(
            ConversationMother.create().withId(randomUUID()).between(coachId, athleteId).build(),
        )
        const m1 = randomUUID()
        const m2 = randomUUID()
        await messages.create(
            MessageMother.create()
                .withId(m1)
                .in(conversation.id)
                .from(coachId)
                .createdAtTime(new Date('2026-03-01T10:00:00Z'))
                .build(),
        )
        await messages.create(
            MessageMother.create()
                .withId(m2)
                .in(conversation.id)
                .from(coachId)
                .createdAtTime(new Date('2026-03-01T10:01:00Z'))
                .build(),
        )

        // Athlete has read nothing → both coach messages are unread.
        expect(await participantStates.countUnread(conversation.id, athleteId)).toBe(2)

        // Insert: both delivered up to the latest, nothing read yet.
        const state = ParticipantStateEntity.empty(conversation.id, athleteId)
        state.markDelivered(m2)
        await participantStates.upsert(state)

        const delivered = await participantStates.receiverCursor(conversation.id, athleteId)
        expect(delivered.delivered?.id).toBe(m2)
        expect(delivered.read).toBeNull()
        // The unread count keys off the read cursor, not delivery.
        expect(await participantStates.countUnread(conversation.id, athleteId)).toBe(2)

        // Update the same PK row: now read up to the latest.
        state.markRead(m2, new Date('2026-03-01T10:02:00Z'))
        await participantStates.upsert(state)

        const read = await participantStates.receiverCursor(conversation.id, athleteId)
        expect(read.read?.id).toBe(m2)
        expect(await participantStates.countUnread(conversation.id, athleteId)).toBe(0)

        // One row for the pair — the second upsert updated, not inserted.
        const stored = await participantStates.get(conversation.id, athleteId)
        expect(stored?.lastReadMessageId).toBe(m2)
    })

    it('backfills a conversation for every pre-existing coach↔athlete link (idempotent)', async () => {
        const coachId = randomUUID()
        const athleteId = randomUUID()
        const since = new Date('2025-12-01T00:00:00Z')
        await db.execute(sql`
            INSERT INTO coach_athlete (id, coach_id, athlete_id, created_at)
            VALUES (${randomUUID()}, ${coachId}, ${athleteId}, ${since.toISOString()})
        `)

        const backfill = backfillStatement()
        await db.execute(sql.raw(backfill))
        // Running it twice must not create a duplicate (ON CONFLICT DO NOTHING).
        await db.execute(sql.raw(backfill))

        const conversation = await conversations.findByPair(coachId, athleteId)
        expect(conversation).not.toBeNull()
        // The conversation inherits the link's own start date.
        expect(conversation?.createdAt.toISOString()).toBe(since.toISOString())

        const rows = await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM chat_conversations`)
        expect(rows.rows[0]?.count).toBe(1)
    })
})

/** The backfill INSERT read straight from the migration file, not a copy. */
function backfillStatement(): string {
    const file = readFileSync('./drizzle/0064_blushing_northstar.sql', 'utf8')
    const statement = file
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .find((s) => s.includes('INSERT INTO "chat_conversations"') && s.includes('coach_athlete'))
    if (!statement) throw new Error('backfill statement not found in migration')
    return statement
}
