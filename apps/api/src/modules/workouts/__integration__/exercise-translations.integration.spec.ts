import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { WorkoutSessionMother } from '../../../../tests/mothers/workouts'
import { DrizzleExerciseStatsReadModel } from '../infrastructure/persistence/read-models/drizzle-exercise-stats.read-model'
import { DrizzleExerciseRepository } from '../infrastructure/persistence/repositories/drizzle-exercise.repository'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let exercises: DrizzleExerciseRepository
let stats: DrizzleExerciseStatsReadModel
let sessions: DrizzleWorkoutSessionRepository
// `translated` has a Spanish name; `untranslated` has none (English fallback).
let translated: string
let untranslated: string

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    exercises = new DrizzleExerciseRepository(db)
    stats = new DrizzleExerciseStatsReadModel(db)
    sessions = new DrizzleWorkoutSessionRepository(db)

    // Two squat exercises whose English order (Alpha < Zebra) reverses in Spanish
    // (Aaa < Alpha), so a locale-ordered listing proves it sorts on the translation.
    const [a, b] = await db
        .insert(schema.exercises)
        .values([
            {
                slug: 'zebra-squat-xt',
                name: 'Zebra Squat',
                category: 'squat',
                equipment: 'barbell',
                primaryMuscle: 'quads',
            },
            {
                slug: 'alpha-squat-xt',
                name: 'Alpha Squat',
                category: 'squat',
                equipment: 'barbell',
                primaryMuscle: 'quads',
            },
        ])
        .returning({ id: schema.exercises.id, slug: schema.exercises.slug })
    translated = (a!.slug === 'zebra-squat-xt' ? a! : b!).id
    untranslated = (a!.slug === 'alpha-squat-xt' ? a! : b!).id

    await db
        .insert(schema.exerciseTranslations)
        .values({ exerciseId: translated, locale: 'es', name: 'Aaa Sentadilla' })
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

describe('Exercise translations (integration)', () => {
    it('localizes the catalog name to the requested locale, English-fallback otherwise', async () => {
        const es = await exercises.findAll({ categories: ['squat'] }, undefined, 'es')
        const byId = new Map(es.map((e) => [e.id, e.name]))

        expect(byId.get(translated)).toBe('Aaa Sentadilla')
        // No Spanish row → falls back to the canonical English name.
        expect(byId.get(untranslated)).toBe('Alpha Squat')
    })

    it('orders the catalog by the localized name (Spanish order ≠ English order)', async () => {
        const es = await exercises.findAll({ categories: ['squat'] }, undefined, 'es')
        const order = es.map((e) => e.id)

        // Spanish: "Aaa Sentadilla" (translated) precedes "Alpha Squat" (untranslated).
        expect(order.indexOf(translated)).toBeLessThan(order.indexOf(untranslated))
    })

    it('returns canonical English names when no locale is given (admin/default path)', async () => {
        const en = await exercises.findAll({ categories: ['squat'] })
        const byId = new Map(en.map((e) => [e.id, e.name]))

        expect(byId.get(translated)).toBe('Zebra Squat')
        expect(byId.get(untranslated)).toBe('Alpha Squat')
    })

    it('localizes the exercise name in per-exercise stats', async () => {
        const userId = randomUUID()
        await sessions.save(WorkoutSessionMother.withTree(translated, { userId }))

        const rows = await stats.perExercise({ userId, locale: 'es' })

        expect(rows.find((r) => r.exerciseId === translated)?.name).toBe('Aaa Sentadilla')
    })

    it('upserts, reads back, and clears an admin-edited Spanish name', async () => {
        // Upsert a fresh Spanish name for the untranslated exercise.
        await exercises.upsertTranslation(untranslated, 'es', 'Alfa Sentadilla')
        expect(await exercises.translationsFor([untranslated], 'es')).toEqual(
            new Map([[untranslated, 'Alfa Sentadilla']]),
        )
        // The athlete catalog now reflects it.
        const afterSet = await exercises.findAll({ categories: ['squat'] }, undefined, 'es')
        expect(new Map(afterSet.map((e) => [e.id, e.name])).get(untranslated)).toBe('Alfa Sentadilla')

        // Upsert again overwrites (not duplicates).
        await exercises.upsertTranslation(untranslated, 'es', 'Alfa Sentadilla v2')
        expect((await exercises.translationsFor([untranslated], 'es')).get(untranslated)).toBe('Alfa Sentadilla v2')

        // Clearing reverts to the English fallback.
        await exercises.deleteTranslation(untranslated, 'es')
        expect(await exercises.translationsFor([untranslated], 'es')).toEqual(new Map())
        const afterClear = await exercises.findAll({ categories: ['squat'] }, undefined, 'es')
        expect(new Map(afterClear.map((e) => [e.id, e.name])).get(untranslated)).toBe('Alpha Squat')
    })

    it('applies the Spanish seed migration to the whole catalog (locale es)', async () => {
        const es = await exercises.findAll(undefined, undefined, 'es')
        const bySlug = new Map(es.map((e) => [e.slug, e.name]))

        expect(bySlug.get('back-squat')).toBe('Sentadilla Trasera')
        expect(bySlug.get('bench-press')).toBe('Press de Banca con Barra')
        expect(bySlug.get('conventional-deadlift')).toBe('Peso Muerto Convencional')
        // A term deliberately kept in English is seeded verbatim (not left untranslated).
        expect(bySlug.get('larsen-press')).toBe('Larsen Press')

        const allTranslations = await db.select().from(schema.exerciseTranslations)
        const seeded = allTranslations.filter((r) => r.locale === 'es')
        // 274 catalog names from the seed migration (plus the one this suite inserts).
        expect(seeded.length).toBeGreaterThanOrEqual(274)
    })
})
