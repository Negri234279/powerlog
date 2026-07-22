import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { WorkoutTemplateMother } from '../../../../tests/mothers/workouts'
import { TemplateNameVO } from '../domain/value-objects/template-name.vo'
import { DrizzleWorkoutTemplateListReadModel } from '../infrastructure/persistence/read-models/drizzle-workout-template-list.read-model'
import { DrizzleWorkoutTemplateRepository } from '../infrastructure/persistence/repositories/drizzle-workout-template.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let templates: DrizzleWorkoutTemplateRepository
let list: DrizzleWorkoutTemplateListReadModel
let exerciseId: string

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    templates = new DrizzleWorkoutTemplateRepository(db)
    list = new DrizzleWorkoutTemplateListReadModel(db)
    const [exercise] = await db.select().from(schema.exercises).limit(1)
    exerciseId = exercise!.id
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE workout_templates RESTART IDENTITY CASCADE`)
})

describe('WorkoutTemplate persistence (integration)', () => {
    it('round-trips the full tree with programmed targets', async () => {
        const ownerId = randomUUID()
        const template = WorkoutTemplateMother.withTree(exerciseId, { ownerId })
        await templates.save(template)

        const found = await templates.findById(template.id)
        expect(found).not.toBeNull()
        expect(found!.ownerId).toBe(ownerId)
        expect(found!.name.value).toBe('Upper A')
        expect(found!.exercises).toHaveLength(1)

        const [exercise] = found!.exercises
        expect(exercise!.exerciseId).toBe(exerciseId)
        expect(exercise!.sets.map((s) => s.order)).toEqual([1, 2])
        expect(exercise!.sets[0]!.plannedWeight?.min.value).toBe(100)
        expect(exercise!.sets[0]!.plannedReps?.min.value).toBe(5)
        expect(exercise!.sets[0]!.rpe?.min.value).toBe(8)
    })

    it('replaces children on re-save (whole-tree upsert)', async () => {
        const template = WorkoutTemplateMother.withTree(exerciseId, { ownerId: randomUUID() })
        await templates.save(template)

        template.replaceContent(
            {
                name: TemplateNameVO.create('Upper B'),
                notes: null,
                exercises: [{ exerciseId, sets: [{}] }],
            },
            () => randomUUID(),
            new Date(),
        )
        await templates.save(template)

        const found = await templates.findById(template.id)
        expect(found!.name.value).toBe('Upper B')
        expect(found!.exercises).toHaveLength(1)
        expect(found!.exercises[0]!.sets).toHaveLength(1)
    })

    it('deletes the template and cascades to exercises and sets', async () => {
        const template = WorkoutTemplateMother.withTree(exerciseId, { ownerId: randomUUID() })
        await templates.save(template)

        await templates.delete(template.id)

        expect(await templates.findById(template.id)).toBeNull()
        const remainingSets = await db.select().from(schema.workoutTemplateSets)
        expect(remainingSets).toHaveLength(0)
    })

    it('deleteAllByOwner erases only that ownerâ€™s templates (with cascade)', async () => {
        const ownerId = randomUUID()
        const other = randomUUID()
        const own = WorkoutTemplateMother.withTree(exerciseId, { ownerId })
        const survivor = WorkoutTemplateMother.withTree(exerciseId, { ownerId: other })
        await templates.save(own)
        await templates.save(survivor)

        await templates.deleteAllByOwner(ownerId)

        expect(await templates.findById(own.id)).toBeNull()
        expect(await templates.findById(survivor.id)).not.toBeNull()
        // Only the surviving template's sets remain (own's cascaded away).
        const remainingSets = await db.select().from(schema.workoutTemplateSets)
        expect(remainingSets).toHaveLength(survivor.exercises[0]!.sets.length)
    })

    it('lists the ownerâ€™s templates with exercise/set rollups, ordered by name', async () => {
        const ownerId = randomUUID()
        await templates.save(
            WorkoutTemplateMother.withTree(exerciseId, {
                ownerId,
                content: { name: TemplateNameVO.create('Zebra'), exercises: [{ exerciseId, sets: [{}, {}] }] },
            }),
        )
        await templates.save(
            WorkoutTemplateMother.withTree(exerciseId, {
                ownerId,
                content: { name: TemplateNameVO.create('Alpha'), exercises: [{ exerciseId, sets: [{}] }] },
            }),
        )
        // Another owner's template must not leak.
        await templates.save(WorkoutTemplateMother.withTree(exerciseId, { ownerId: randomUUID() }))

        const rows = await list.list({ ownerId })
        expect(rows.map((r) => r.name)).toEqual(['Alpha', 'Zebra'])
        expect(rows[0]).toMatchObject({ exerciseCount: 1, setCount: 1 })
        expect(rows[1]).toMatchObject({ exerciseCount: 1, setCount: 2 })

        const searched = await list.list({ ownerId, search: 'alph' })
        expect(searched.map((r) => r.name)).toEqual(['Alpha'])
    })

    it('separates personal and coaching templates by scope', async () => {
        const ownerId = randomUUID()
        await templates.save(
            WorkoutTemplateMother.withTree(exerciseId, {
                ownerId,
                scope: 'personal',
                content: { name: TemplateNameVO.create('My own'), exercises: [{ exerciseId, sets: [{}] }] },
            }),
        )
        await templates.save(
            WorkoutTemplateMother.withTree(exerciseId, {
                ownerId,
                scope: 'coaching',
                content: { name: TemplateNameVO.create('For athletes'), exercises: [{ exerciseId, sets: [{}] }] },
            }),
        )

        const personal = await list.list({ ownerId, scope: 'personal' })
        const coaching = await list.list({ ownerId, scope: 'coaching' })
        const both = await list.list({ ownerId })

        expect(personal.map((r) => r.name)).toEqual(['My own'])
        expect(coaching.map((r) => r.name)).toEqual(['For athletes'])
        // The scope rides along on each row; omitting the filter returns both.
        expect(personal[0]?.scope).toBe('personal')
        expect(both).toHaveLength(2)
    })
})
