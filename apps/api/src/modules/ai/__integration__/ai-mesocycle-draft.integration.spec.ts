import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { AiMesocycleDraftMother, mesocycleDraftDay, mesocycleDraftProposal } from '../../../../tests/mothers/ai'
import { InvalidMesocycleDraftProposalError } from '../domain/errors/ai-mesocycle.errors'
import { DrizzleAiMesocycleDraftRepository } from '../infrastructure/persistence/repositories/drizzle-ai-mesocycle-draft.repository'
import { aiMesocycleDrafts } from '../infrastructure/persistence/schema/ai-mesocycle-drafts.schema'

const NOW = new Date('2026-03-01T00:00:00.000Z')

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let drafts: DrizzleAiMesocycleDraftRepository

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    drafts = new DrizzleAiMesocycleDraftRepository(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ai_mesocycle_drafts RESTART IDENTITY CASCADE`)
})

describe('AI mesocycle drafts (integration)', () => {
    it('round-trips the proposed week through the jsonb column', async () => {
        const userId = randomUUID()
        const proposal = mesocycleDraftProposal({
            name: 'Squat block',
            days: [mesocycleDraftDay({ dayOffset: 0 }), mesocycleDraftDay({ dayOffset: 3 })],
        })
        await drafts.save(AiMesocycleDraftMother.persistable({ userId, trainingDays: [0, 3], proposal, weeks: 6 }))

        const stored = await drafts.findOpenByUser(userId, null)

        expect(stored?.weeks).toBe(6)
        expect(stored?.trainingDays).toEqual([0, 3])
        expect(stored?.proposal.name).toBe('Squat block')
        expect(stored?.proposal.days.map((day) => day.dayOffset)).toEqual([0, 3])
        expect(stored?.proposal.days[0]?.exercises[0]?.sets[0]?.plannedWeightKg).toBe(100)
    })

    it('keeps the conversation in the order it was said', async () => {
        const draft = AiMesocycleDraftMother.persistable()
        // The request and its answer share a timestamp, so ordering by `created_at`
        // would be a coin toss. `position` is what makes this deterministic.
        draft.addMessage({ id: randomUUID(), role: 'user', content: 'lighter' }, NOW)
        draft.revise(mesocycleDraftProposal(), { rationaleId: randomUUID(), rationale: 'Backed off.' }, NOW)
        await drafts.save(draft)

        const stored = await drafts.findById(draft.id)

        expect(stored?.messages.map((message) => message.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
        expect(stored?.messages.at(-1)?.content).toBe('Backed off.')
    })

    it('replaces the week on save, and appends messages without duplicating them', async () => {
        const draft = AiMesocycleDraftMother.persistable()
        await drafts.save(draft)

        draft.revise(mesocycleDraftProposal({ name: 'Revised' }), { rationaleId: randomUUID(), rationale: 'x' }, NOW)
        await drafts.save(draft)

        const stored = await drafts.findById(draft.id)
        expect(stored?.proposal.name).toBe('Revised')
        expect(stored?.messages).toHaveLength(3)
    })

    it('lets an athlete hold only one open draft — the index says so, not the code', async () => {
        const userId = randomUUID()
        await drafts.save(AiMesocycleDraftMother.persistable({ userId }))

        await expect(drafts.save(AiMesocycleDraftMother.persistable({ userId }))).rejects.toThrow()
    })

    it('allows a second draft once the first is resolved', async () => {
        const userId = randomUUID()
        const first = AiMesocycleDraftMother.persistable({ userId })
        await drafts.save(first)
        first.discard(NOW)
        await drafts.save(first)

        const second = AiMesocycleDraftMother.persistable({ userId })

        await expect(drafts.save(second)).resolves.toBeUndefined()
        expect(await drafts.findOpenByUser(userId, null)).toMatchObject({ id: second.id })
    })

    it('erases a user’s drafts and their messages on account deletion', async () => {
        const userId = randomUUID()
        await drafts.save(AiMesocycleDraftMother.persistable({ userId }))

        await drafts.deleteAllByUser(userId)

        expect(await drafts.findOpenByUser(userId, null)).toBeNull()
        expect(await db.select().from(schema.aiMesocycleDraftMessages)).toHaveLength(0)
    })

    it('refuses to rehydrate a week that Postgres was happy to store', async () => {
        const draft = AiMesocycleDraftMother.persistable()
        await drafts.save(draft)
        // jsonb is not shape-checked: nothing stops a bad write or a half-migration.
        await db.execute(sql`UPDATE ai_mesocycle_drafts SET content = '{"name":"x","days":[]}'::jsonb`)

        await expect(drafts.findById(draft.id)).rejects.toThrow(InvalidMesocycleDraftProposalError)
    })

    it('does not leak another athlete’s open draft', async () => {
        await drafts.save(AiMesocycleDraftMother.persistable({ userId: randomUUID() }))

        expect(await drafts.findOpenByUser(randomUUID(), null)).toBeNull()
    })

    it('lets a coach hold one open draft per athlete, plus one of their own', async () => {
        const coachId = randomUUID()
        const ana = randomUUID()
        const luis = randomUUID()

        const own = AiMesocycleDraftMother.persistable({ userId: coachId })
        const forAna = AiMesocycleDraftMother.persistable({ userId: coachId, athleteId: ana })
        const forLuis = AiMesocycleDraftMother.persistable({ userId: coachId, athleteId: luis })
        await drafts.save(own)
        await drafts.save(forAna)
        await drafts.save(forLuis)

        // Three open drafts coexist because the unique index is keyed on the pair…
        expect(await drafts.findOpenByUser(coachId, null)).toMatchObject({ id: own.id })
        expect(await drafts.findOpenByUser(coachId, ana)).toMatchObject({ id: forAna.id })
        expect(await drafts.findOpenByUser(coachId, luis)).toMatchObject({ id: forLuis.id })
    })

    it('still allows only one open draft per (coach, athlete) pair', async () => {
        const coachId = randomUUID()
        const athleteId = randomUUID()
        await drafts.save(AiMesocycleDraftMother.persistable({ userId: coachId, athleteId }))

        // A second open draft for the same athlete is what the partial index forbids.
        await expect(drafts.save(AiMesocycleDraftMother.persistable({ userId: coachId, athleteId }))).rejects.toThrow()
    })

    it('stores the training days as a real integer array', async () => {
        const proposal = mesocycleDraftProposal({ days: [mesocycleDraftDay({ dayOffset: 6 })] })
        await drafts.save(AiMesocycleDraftMother.persistable({ trainingDays: [6], proposal }))

        const [row] = await db.select().from(aiMesocycleDrafts)

        expect(row?.trainingDays).toEqual([6])
    })
})
