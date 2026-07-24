import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { AiGenerationMother, mesocycleRequest, sessionPlanRequest } from '../../../../tests/mothers/ai'
import * as schema from '../../../database/schema'
import { AiGenerationAlreadyInFlightError } from '../domain/errors/ai-generation.errors'
import { DrizzleAiGenerationRepository } from '../infrastructure/persistence/repositories/drizzle-ai-generation.repository'

const NOW = new Date('2026-03-01T00:00:00.000Z')

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let generations: DrizzleAiGenerationRepository

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    generations = new DrizzleAiGenerationRepository(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE ai_generations RESTART IDENTITY CASCADE`)
})

describe('AI generations (integration)', () => {
    it('round-trips the request through the jsonb column', async () => {
        const request = mesocycleRequest({ weeks: 6, trainingDays: [0, 3], goal: 'squat', prompt: 'knees are cranky' })
        const queued = AiGenerationMother.mesocycle(request, { now: NOW })
        await generations.save(queued)

        const stored = await generations.findById(queued.id)

        expect(stored?.status.value).toBe('queued')
        expect(stored?.kind.value).toBe('mesocycle')
        expect(stored?.request).toEqual(request)
    })

    it('finds what is in flight for a scope, and stops finding it once it settles', async () => {
        const sessionId = randomUUID()
        const generation = AiGenerationMother.sessionPlan(sessionPlanRequest({ sessionId }), { now: NOW })
        await generations.save(generation)

        expect(await generations.findUnsettledByScope(`session:${sessionId}`)).not.toBeNull()

        generation.start(NOW)
        await generations.save(generation)
        expect(await generations.findUnsettledByScope(`session:${sessionId}`)).not.toBeNull()

        generation.succeed(randomUUID(), NOW)
        await generations.save(generation)
        expect(await generations.findUnsettledByScope(`session:${sessionId}`)).toBeNull()
    })

    it('refuses a second job for a scope that is already being generated', async () => {
        const sessionId = randomUUID()
        await generations.save(AiGenerationMother.sessionPlan(sessionPlanRequest({ sessionId }), { now: NOW }))

        const second = AiGenerationMother.sessionPlan(sessionPlanRequest({ sessionId }), { now: NOW })

        await expect(generations.save(second)).rejects.toThrow(AiGenerationAlreadyInFlightError)
    })

    it('lets the scope be asked for again once the first answer arrived', async () => {
        const sessionId = randomUUID()
        const first = AiGenerationMother.sessionPlan(sessionPlanRequest({ sessionId }), { now: NOW })
        await generations.save(first)
        first.start(NOW)
        first.fail('INVALID_AI_MESOCYCLE_RESPONSE', NOW)
        await generations.save(first)

        const second = AiGenerationMother.sessionPlan(sessionPlanRequest({ sessionId }), { now: NOW })

        await expect(generations.save(second)).resolves.toBeUndefined()
    })

    it('keeps a coach’s own block apart from the one they design for an athlete', async () => {
        const userId = randomUUID()
        const athleteId = randomUUID()
        await generations.save(AiGenerationMother.mesocycle(mesocycleRequest(), { userId, now: NOW }))

        const forAthlete = AiGenerationMother.mesocycle(mesocycleRequest({ athleteId }), { userId, now: NOW })

        await expect(generations.save(forAthlete)).resolves.toBeUndefined()
    })

    it('records the outcome without rewriting what was asked for', async () => {
        const request = sessionPlanRequest()
        const generation = AiGenerationMother.sessionPlan(request, { now: NOW })
        await generations.save(generation)
        const draftId = randomUUID()

        generation.start(NOW)
        generation.succeed(draftId, NOW)
        await generations.save(generation)

        const stored = await generations.findById(generation.id)
        expect(stored?.status.value).toBe('succeeded')
        expect(stored?.draftId).toBe(draftId)
        expect(stored?.request).toEqual(request)
    })

    it('erases every generation a user owns', async () => {
        const userId = randomUUID()
        await generations.save(AiGenerationMother.sessionPlan(sessionPlanRequest(), { userId, now: NOW }))
        const other = AiGenerationMother.sessionPlan(sessionPlanRequest(), { now: NOW })
        await generations.save(other)

        await generations.deleteAllByUser(userId)

        expect(await generations.findById(other.id)).not.toBeNull()
        const remaining = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.aiGenerations)
            .where(sql`${schema.aiGenerations.userId} = ${userId}`)
        expect(remaining[0]?.count).toBe(0)
    })
})
