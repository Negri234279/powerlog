import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { FakeClock } from '../../../../tests/doubles/workouts'
import { MesocycleMother } from '../../../../tests/mothers/workouts'
import { GenerateMesocycleWeekCommand } from '../application/commands/generate-mesocycle-week/generate-mesocycle-week.command'
import { GenerateMesocycleWeekHandler } from '../application/commands/generate-mesocycle-week/generate-mesocycle-week.handler'
import { GetMesocycleQuery } from '../application/queries/get-mesocycle/get-mesocycle.query'
import { GetMesocycleHandler } from '../application/queries/get-mesocycle/get-mesocycle.handler'
import type { MesocycleContentInput } from '../domain/entities/mesocycle.entity'
import { MesocycleNameVO } from '../domain/value-objects/mesocycle-name.vo'
import { RepsVO } from '../domain/value-objects/reps.vo'
import { UuidGenerator } from '../infrastructure/id/uuid-generator'
import { DrizzleMesocycleListReadModel } from '../infrastructure/persistence/read-models/drizzle-mesocycle-list.read-model'
import { DrizzleMesocycleRepository } from '../infrastructure/persistence/repositories/drizzle-mesocycle.repository'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let mesocycles: DrizzleMesocycleRepository
let list: DrizzleMesocycleListReadModel
let sessions: DrizzleWorkoutSessionRepository
let exerciseId: string

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    mesocycles = new DrizzleMesocycleRepository(db)
    list = new DrizzleMesocycleListReadModel(db)
    sessions = new DrizzleWorkoutSessionRepository(db)
    const [exercise] = await db.select().from(schema.exercises).limit(1)
    exerciseId = exercise!.id
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE mesocycles, workout_sessions RESTART IDENTITY CASCADE`)
})

/** A one-week, one-day content tree with `setCount` empty sets, for list rollups. */
function content(name: string, weeks: number, setCount: number): MesocycleContentInput {
    return {
        name: MesocycleNameVO.create(name),
        microcycles: Array.from({ length: weeks }, () => ({
            days: [
                {
                    dayOffset: 0,
                    exercises: [
                        {
                            exerciseId,
                            sets: Array.from({ length: setCount }, () => ({ plannedReps: RepsVO.create(5) })),
                        },
                    ],
                },
            ],
        })),
    }
}

describe('Mesocycle persistence (integration)', () => {
    it('round-trips the full 4-level tree with details and programmed targets', async () => {
        const ownerId = randomUUID()
        const mesocycle = MesocycleMother.withTree(exerciseId, { ownerId })
        await mesocycles.save(mesocycle)

        const found = await mesocycles.findById(mesocycle.id)
        expect(found).not.toBeNull()
        expect(found!.ownerId).toBe(ownerId)
        expect(found!.name.value).toBe('Hypertrophy Block')
        expect(found!.goal).toBe('hypertrophy')
        expect(found!.status).toBe('draft')
        expect(found!.startDate?.toISOString().slice(0, 10)).toBe('2026-01-05')
        expect(found!.microcycles.map((m) => m.weekIndex)).toEqual([1, 2])

        const week1Day = found!.microcycles[0]!.days[0]!
        expect(week1Day.dayOffset).toBe(0)
        expect(week1Day.exercises[0]!.exerciseId).toBe(exerciseId)
        expect(week1Day.exercises[0]!.sets.map((s) => s.order)).toEqual([1, 2])
        expect(week1Day.exercises[0]!.sets[0]!.plannedWeight?.value).toBe(100)
        expect(week1Day.exercises[0]!.sets[0]!.rpe?.value).toBe(8)
        expect(found!.microcycles[1]!.days[0]!.exercises[0]!.sets[0]!.plannedWeight?.value).toBe(105)
    })

    it('replaces children on re-save (whole-tree upsert)', async () => {
        const mesocycle = MesocycleMother.withTree(exerciseId, { ownerId: randomUUID() })
        await mesocycles.save(mesocycle)

        mesocycle.replaceContent(content('Trimmed', 1, 1), () => randomUUID(), new Date())
        await mesocycles.save(mesocycle)

        const found = await mesocycles.findById(mesocycle.id)
        expect(found!.name.value).toBe('Trimmed')
        expect(found!.microcycles).toHaveLength(1)
        expect(found!.microcycles[0]!.days[0]!.exercises[0]!.sets).toHaveLength(1)
    })

    it('deletes the mesocycle and cascades to the whole tree', async () => {
        const mesocycle = MesocycleMother.withTree(exerciseId, { ownerId: randomUUID() })
        await mesocycles.save(mesocycle)

        await mesocycles.delete(mesocycle.id)

        expect(await mesocycles.findById(mesocycle.id)).toBeNull()
        expect(await db.select().from(schema.mesocycleDaySets)).toHaveLength(0)
        expect(await db.select().from(schema.mesocycleMicrocycles)).toHaveLength(0)
    })

    it('deleteAllByOwner erases only that owner’s mesocycles (with cascade)', async () => {
        const ownerId = randomUUID()
        const own = MesocycleMother.withTree(exerciseId, { ownerId })
        const survivor = MesocycleMother.withTree(exerciseId, { ownerId: randomUUID() })
        await mesocycles.save(own)
        await mesocycles.save(survivor)

        await mesocycles.deleteAllByOwner(ownerId)

        expect(await mesocycles.findById(own.id)).toBeNull()
        expect(await mesocycles.findById(survivor.id)).not.toBeNull()
    })

    it('lists the owner’s mesocycles with week/day rollups and name search', async () => {
        const ownerId = randomUUID()
        await mesocycles.save(MesocycleMother.withTree(exerciseId, { ownerId, content: content('Alpha', 1, 1) }))
        await mesocycles.save(MesocycleMother.withTree(exerciseId, { ownerId, content: content('Zebra', 2, 1) }))
        // Another owner's mesocycle must not leak.
        await mesocycles.save(MesocycleMother.withTree(exerciseId, { ownerId: randomUUID() }))

        const rows = await list.list({ ownerId })
        expect(rows).toHaveLength(2)
        expect(rows.map((r) => r.name).sort()).toEqual(['Alpha', 'Zebra'])
        expect(rows.find((r) => r.name === 'Alpha')).toMatchObject({ weekCount: 1, dayCount: 1 })
        expect(rows.find((r) => r.name === 'Zebra')).toMatchObject({ weekCount: 2, dayCount: 2 })

        const searched = await list.list({ ownerId, search: 'alph' })
        expect(searched.map((r) => r.name)).toEqual(['Alpha'])
    })
})

describe('Mesocycle generation (integration)', () => {
    function generator() {
        return new GenerateMesocycleWeekHandler(
            mesocycles,
            sessions,
            new FakeClock(new Date('2026-03-01T10:00:00.000Z')),
            new UuidGenerator(),
        )
    }

    it('materializes a week into linked planned sessions and reports generated weeks', async () => {
        const ownerId = randomUUID()
        const mesocycle = MesocycleMother.withTree(exerciseId, { ownerId })
        await mesocycles.save(mesocycle)

        const views = await generator().execute(new GenerateMesocycleWeekCommand(ownerId, mesocycle.id, 1))

        expect(views).toHaveLength(1)
        const persisted = await sessions.findById(views[0]!.id)
        expect(persisted!.status).toBe('planned')
        expect(persisted!.mesocycleId).toBe(mesocycle.id)
        expect(persisted!.mesocycleWeek).toBe(1)
        expect(persisted!.entries[0]!.sets[0]!.plannedWeight?.value).toBe(100)

        const detail = await new GetMesocycleHandler(mesocycles, sessions).execute(
            new GetMesocycleQuery(ownerId, mesocycle.id),
        )
        expect(detail.generatedWeeks).toEqual([1])
    })

    it('replace regenerates the still-planned sessions of a week', async () => {
        const ownerId = randomUUID()
        const mesocycle = MesocycleMother.withTree(exerciseId, { ownerId })
        await mesocycles.save(mesocycle)
        await generator().execute(new GenerateMesocycleWeekCommand(ownerId, mesocycle.id, 1))

        await generator().execute(new GenerateMesocycleWeekCommand(ownerId, mesocycle.id, 1, null, true))

        const rows = await db.select().from(schema.workoutSessions)
        expect(rows.filter((r) => r.mesocycleWeek === 1)).toHaveLength(1)
    })
})
