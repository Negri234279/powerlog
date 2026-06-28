import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { ExerciseEntity } from '../domain/entities/exercise.entity'
import { EXERCISE_CATEGORIES } from '../domain/exercise-taxonomy'
import { DrizzleExerciseRepository } from '../infrastructure/persistence/repositories/drizzle-exercise.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let exercises: DrizzleExerciseRepository

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    // Runs all migrations, including the catalog seed (INSERT ... ON CONFLICT).
    await migrate(db, { migrationsFolder: './drizzle' })
    exercises = new DrizzleExerciseRepository(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

describe('Exercise catalog (integration)', () => {
    it('seeds the catalog via migration and lists it ordered', async () => {
        const all = await exercises.findAll()

        expect(all.length).toBeGreaterThanOrEqual(40)
        expect(all.map((e) => e.slug)).toContain('back-squat')
        // Catalog expansions (0015 + 0016) are seeded too.
        expect(all.map((e) => e.slug)).toContain('standing-single-leg-curl')
        expect(all.map((e) => e.slug)).toContain('reverse-hack-squat')
        // Ordered by category (enum-declaration order), then name.
        const sorted = [...all].sort(
            (a, b) =>
                EXERCISE_CATEGORIES.indexOf(a.category) - EXERCISE_CATEGORIES.indexOf(b.category) ||
                a.name.localeCompare(b.name),
        )
        expect(all.map((e) => e.id)).toEqual(sorted.map((e) => e.id))
    })

    it('filters by category, equipment and free text', async () => {
        const squats = await exercises.findAll({ categories: ['squat'] })
        expect(squats.length).toBeGreaterThan(0)
        expect(squats.every((e) => e.category === 'squat')).toBe(true)
        expect(squats.map((e) => e.slug)).toContain('back-squat')

        const machines = await exercises.findAll({ equipment: ['machine'] })
        expect(machines.every((e) => e.equipment === 'machine')).toBe(true)

        const byText = await exercises.findAll({ search: 'back-squat' })
        expect(byText.map((e) => e.slug)).toContain('back-squat')
    })

    it('finds an exercise by id and slug, and returns null for an unknown one', async () => {
        const [first] = await exercises.findAll({ categories: ['bench'] })
        expect(first).toBeDefined()

        expect(await exercises.findById(first!.id)).toMatchObject({ id: first!.id, slug: first!.slug })
        expect(await exercises.findBySlug(first!.slug)).toMatchObject({ id: first!.id })
        expect(await exercises.findById('00000000-0000-0000-0000-000000000000')).toBeNull()
        expect(await exercises.findBySlug('no-such-slug')).toBeNull()
    })
})

describe('Exercise catalog write side (integration)', () => {
    it('inserts, updates and deletes an unreferenced exercise', async () => {
        const exercise = ExerciseEntity.create({
            id: randomUUID(),
            slug: `test-lift-${Date.now()}`,
            name: 'Test Lift',
            category: 'legs',
            equipment: 'machine',
            primaryMuscle: 'quads',
        })

        await exercises.insert(exercise)
        expect(await exercises.findBySlug(exercise.slug)).toMatchObject({ name: 'Test Lift' })

        exercise.update({ name: 'Renamed Lift', primaryMuscle: 'glutes' })
        await exercises.update(exercise)
        expect(await exercises.findById(exercise.id)).toMatchObject({ name: 'Renamed Lift', primaryMuscle: 'glutes' })
        // slug is immutable across updates.
        expect((await exercises.findById(exercise.id))?.slug).toBe(exercise.slug)

        expect(await exercises.countReferences(exercise.id)).toBe(0)
        await exercises.delete(exercise.id)
        expect(await exercises.findById(exercise.id)).toBeNull()
    })

    it('counts references from workout entries (so the catalog can refuse deletes)', async () => {
        const exercise = ExerciseEntity.create({
            id: randomUUID(),
            slug: `referenced-${Date.now()}`,
            name: 'Referenced Lift',
            category: 'legs',
            equipment: 'machine',
            primaryMuscle: 'quads',
        })
        await exercises.insert(exercise)

        const [session] = await db
            .insert(schema.workoutSessions)
            .values({ userId: randomUUID(), status: 'completed', performedAt: new Date() })
            .returning({ id: schema.workoutSessions.id })
        await db
            .insert(schema.workoutExerciseEntries)
            .values({ sessionId: session!.id, exerciseId: exercise.id, order: 0 })

        expect(await exercises.countReferences(exercise.id)).toBe(1)
    })
})
