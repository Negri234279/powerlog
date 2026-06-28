import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { EXERCISE_CATEGORIES, EXERCISE_EQUIPMENT, EXERCISE_MUSCLES } from '../../../domain/exercise-taxonomy'

// Enums derive their values from the domain taxonomy (single source of truth).
export const exerciseCategoryEnum = pgEnum('exercise_category', EXERCISE_CATEGORIES)
export const exerciseEquipmentEnum = pgEnum('exercise_equipment', EXERCISE_EQUIPMENT)
export const exerciseMuscleEnum = pgEnum('exercise_primary_muscle', EXERCISE_MUSCLES)

/**
 * `exercises` — fixed catalog (seeded by migration). Workout sets reference a row
 * by `id`; `slug` is the stable seed key (idempotent upsert on conflict).
 */
export const exercises = pgTable('exercises', {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    category: exerciseCategoryEnum('category').notNull(),
    equipment: exerciseEquipmentEnum('equipment').notNull(),
    primaryMuscle: exerciseMuscleEnum('primary_muscle').notNull(),
})
