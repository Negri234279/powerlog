import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { AiMesocycleDraftMother, AiPlanDraftMother } from '../../../../tests/mothers/ai'
import type { AiDraftSummaryRow } from '../application/ports/ai-draft-history.read-model'
import { AiPlanDraftAggregate } from '../domain/entities/ai-plan-draft.entity'
import { DrizzleAiDraftHistoryReadModel } from '../infrastructure/persistence/read-models/drizzle-ai-draft-history.read-model'
import { DrizzleAiMesocycleDraftRepository } from '../infrastructure/persistence/repositories/drizzle-ai-mesocycle-draft.repository'
import { DrizzleAiPlanDraftRepository } from '../infrastructure/persistence/repositories/drizzle-ai-plan-draft.repository'

const NOW = new Date('2026-03-01T00:00:00.000Z')

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let history: DrizzleAiDraftHistoryReadModel
let plans: DrizzleAiPlanDraftRepository
let mesocycles: DrizzleAiMesocycleDraftRepository

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    history = new DrizzleAiDraftHistoryReadModel(db)
    plans = new DrizzleAiPlanDraftRepository(db)
    mesocycles = new DrizzleAiMesocycleDraftRepository(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ai_plan_drafts, ai_mesocycle_drafts RESTART IDENTITY CASCADE`)
})

/** Nudges a stored draft's `updated_at`, so the feed has an order to prove. */
async function touch(table: 'ai_plan_drafts' | 'ai_mesocycle_drafts', id: string, at: string): Promise<void> {
    const target = sql.raw(table)
    await db.execute(sql`UPDATE ${target} SET updated_at = ${at}::timestamptz WHERE id = ${id}::uuid`)
}

const ids = (items: AiDraftSummaryRow[]): string[] => items.map((item) => item.id)

describe('AI draft history (integration)', () => {
    it('puts session and mesocycle drafts in one feed, newest activity first', async () => {
        const userId = randomUUID()
        const older = AiPlanDraftMother.persistable({ userId })
        const newer = AiMesocycleDraftMother.persistable({ userId })
        await plans.save(older)
        await mesocycles.save(newer)
        await touch('ai_plan_drafts', older.id, '2026-01-01T00:00:00.000Z')
        await touch('ai_mesocycle_drafts', newer.id, '2026-02-01T00:00:00.000Z')

        const page = await history.list({ userId, limit: 10 })

        expect(ids(page.items)).toEqual([newer.id, older.id])
        expect(page.items.map((item) => item.kind)).toEqual(['mesocycle', 'session'])
        expect(page.hasNextPage).toBe(false)
    })

    it('pages the merged feed without skipping or repeating a row', async () => {
        const userId = randomUUID()
        const first = AiPlanDraftMother.persistable({ userId })
        const second = AiMesocycleDraftMother.persistable({ userId })
        const third = AiPlanDraftMother.persistable({ userId })
        await plans.save(first)
        await mesocycles.save(second)
        await plans.save(third)
        await touch('ai_plan_drafts', first.id, '2026-01-03T00:00:00.000Z')
        await touch('ai_mesocycle_drafts', second.id, '2026-01-02T00:00:00.000Z')
        await touch('ai_plan_drafts', third.id, '2026-01-01T00:00:00.000Z')

        const page = await history.list({ userId, limit: 2 })
        expect(ids(page.items)).toEqual([first.id, second.id])
        expect(page.hasNextPage).toBe(true)

        const last = page.items[page.items.length - 1]
        const next = await history.list({
            userId,
            limit: 2,
            cursor: { updatedAt: last!.updatedAt, id: last!.id },
        })

        // The cursor crosses tables: the page before ended on a mesocycle draft.
        expect(ids(next.items)).toEqual([third.id])
        expect(next.hasNextPage).toBe(false)
    })

    it('shows what the athlete asked for as the line’s title', async () => {
        const userId = randomUUID()
        await plans.save(AiPlanDraftMother.persistable({ userId, request: 'more volume on bench' }))

        const page = await history.list({ userId, limit: 10 })

        expect(page.items[0]?.title).toBe('more volume on bench')
        // The request and the model's rationale — the whole thread so far.
        expect(page.items[0]?.messageCount).toBe(2)
    })

    it('leaves the title empty when the draft was generated unprompted', async () => {
        const userId = randomUUID()
        await plans.save(AiPlanDraftMother.persistable({ userId }))

        const page = await history.list({ userId, limit: 10 })

        expect(page.items[0]?.title).toBeNull()
        expect(page.items[0]?.messageCount).toBe(1)
    })

    it('carries the proposed block name on mesocycle lines', async () => {
        const userId = randomUUID()
        await mesocycles.save(AiMesocycleDraftMother.persistable({ userId }))

        const page = await history.list({ userId, limit: 10 })

        expect(page.items[0]?.name).not.toBeNull()
        expect(page.items[0]?.sessionId).toBeNull()
        // The mesocycle branch reads its own message table, so it is worth its
        // own assertion rather than trusting the session one.
        expect(page.items[0]?.messageCount).toBe(2)
    })

    it('keeps accepted and discarded drafts, and can filter down to them', async () => {
        const userId = randomUUID()
        const accepted = AiPlanDraftMother.persistable({ userId })
        const open = AiPlanDraftMother.persistable({ userId })
        accepted.accept(NOW)
        await plans.save(accepted)
        await plans.save(open)

        const all = await history.list({ userId, limit: 10 })
        const resolved = await history.list({ userId, limit: 10, status: 'accepted' })

        expect(all.items).toHaveLength(2)
        expect(ids(resolved.items)).toEqual([accepted.id])
    })

    it('narrows the feed to one kind', async () => {
        const userId = randomUUID()
        const session = AiPlanDraftMother.persistable({ userId })
        await plans.save(session)
        await mesocycles.save(AiMesocycleDraftMother.persistable({ userId }))

        const page = await history.list({ userId, limit: 10, kind: 'session' })

        expect(ids(page.items)).toEqual([session.id])
    })

    it('separates a coach’s own blocks from the ones designed for an athlete', async () => {
        const coachId = randomUUID()
        const athleteId = randomUUID()
        const own = AiMesocycleDraftMother.persistable({ userId: coachId })
        const forAthlete = AiMesocycleDraftMother.persistable({ userId: coachId, athleteId })
        await mesocycles.save(own)
        await mesocycles.save(forAthlete)

        const mine = await history.list({ userId: coachId, limit: 10, athleteId: 'self' })
        const theirs = await history.list({ userId: coachId, limit: 10, athleteId })

        expect(ids(mine.items)).toEqual([own.id])
        expect(ids(theirs.items)).toEqual([forAthlete.id])
    })

    it('returns nothing for filters that cannot both hold', async () => {
        const userId = randomUUID()
        await plans.save(AiPlanDraftMother.persistable({ userId }))
        await mesocycles.save(AiMesocycleDraftMother.persistable({ userId }))

        // A mesocycle draft has no session, and a session draft has no athlete.
        const page = await history.list({ userId, limit: 10, sessionId: randomUUID(), athleteId: randomUUID() })

        expect(page.items).toEqual([])
    })

    it('carries the chain on a forked draft', async () => {
        const userId = randomUUID()
        const source = AiPlanDraftMother.persistable({ userId })
        source.accept(NOW)
        await plans.save(source)
        const fork = AiPlanDraftAggregate.fork({
            id: randomUUID(),
            source,
            provider: source.provider,
            model: source.model,
            rationaleId: randomUUID(),
            now: NOW,
        })
        await plans.save(fork)

        const page = await history.list({ userId, limit: 10 })

        expect(page.items.find((item) => item.id === fork.id)?.parentDraftId).toBe(source.id)
        expect(page.items.find((item) => item.id === source.id)?.parentDraftId).toBeNull()
    })

    it('erases a chain of forks on account deletion, self-reference and all', async () => {
        const userId = randomUUID()
        const source = AiPlanDraftMother.persistable({ userId })
        source.accept(NOW)
        await plans.save(source)
        const fork = AiPlanDraftAggregate.fork({
            id: randomUUID(),
            source,
            provider: source.provider,
            model: source.model,
            rationaleId: randomUUID(),
            now: NOW,
        })
        await plans.save(fork)

        // The parent FK is self-referential; deleting parent and child in one
        // statement must not trip over it.
        await plans.deleteAllByUser(userId)

        expect((await history.list({ userId, limit: 10 })).items).toEqual([])
    })

    it('does not leak another user’s drafts', async () => {
        await plans.save(AiPlanDraftMother.persistable({ userId: randomUUID() }))
        await mesocycles.save(AiMesocycleDraftMother.persistable({ userId: randomUUID() }))

        const page = await history.list({ userId: randomUUID(), limit: 10 })

        expect(page.items).toEqual([])
    })
})
