import { Field, ID, InputType } from '@nestjs/graphql'
import { z } from 'zod'

import { EXERCISE_CATEGORIES, EXERCISE_EQUIPMENT, EXERCISE_MUSCLES } from '../../domain/exercise-taxonomy'

const category = z.enum(EXERCISE_CATEGORIES)
const equipment = z.enum(EXERCISE_EQUIPMENT)
const muscle = z.enum(EXERCISE_MUSCLES)
const name = z.string().trim().min(1).max(80)
const slug = z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and single hyphens.')
    .min(3)
    .max(60)

// ── create exercise ─────────────────────────────────────────────────────
@InputType()
export class CreateExerciseInput {
    @Field()
    name!: string

    @Field(() => String, { description: 'squat | bench | deadlift | chest | back | shoulders | legs | arms | core' })
    category!: string

    @Field(() => String, { description: 'barbell | dumbbell | machine | cable | bodyweight' })
    equipment!: string

    @Field(() => String, { description: 'Primary muscle worked.' })
    primaryMuscle!: string

    @Field(() => String, { nullable: true, description: 'Stable key; derived from name if omitted.' })
    slug?: string | null

    @Field(() => String, { nullable: true, description: 'Spanish display name (optional).' })
    nameEs?: string | null
}

export const createExerciseSchema = z.object({
    name,
    category,
    equipment,
    primaryMuscle: muscle,
    slug: slug.nullable().optional(),
    nameEs: name.nullable().optional(),
})

// ── update exercise (slug immutable) ────────────────────────────────────
@InputType()
export class UpdateExerciseInput {
    @Field(() => ID)
    exerciseId!: string

    @Field(() => String, { nullable: true, description: 'Absent = leave unchanged.' })
    name?: string | null

    @Field(() => String, { nullable: true })
    category?: string | null

    @Field(() => String, { nullable: true })
    equipment?: string | null

    @Field(() => String, { nullable: true })
    primaryMuscle?: string | null

    @Field(() => String, {
        nullable: true,
        description: 'Spanish display name. Empty string clears it; absent leaves it unchanged.',
    })
    nameEs?: string | null
}

// `nameEs` allows an empty string (meaning "clear the Spanish name"), so it isn't
// bound by the non-empty `name` schema.
export const updateExerciseSchema = z.object({
    exerciseId: z.string().uuid(),
    name: name.optional(),
    category: category.optional(),
    equipment: equipment.optional(),
    primaryMuscle: muscle.optional(),
    nameEs: z.string().trim().max(80).nullable().optional(),
})

// ── list filters (admin) ────────────────────────────────────────────────
// GraphQL passes an explicit `null` for an omitted nullable arg, so accept null
// (and undefined) and normalise both to "no filter".
const optionalArg = <T extends z.ZodTypeAny>(schema: T) => schema.nullish().transform((v) => v ?? undefined)

export const categoriesArg = optionalArg(z.array(category))
export const equipmentArg = optionalArg(z.array(equipment))
export const musclesArg = optionalArg(z.array(muscle))
export const searchArg = optionalArg(z.string().trim().min(1).max(100))
export const limitArg = optionalArg(z.coerce.number().int().min(1).max(100))
export const offsetArg = optionalArg(z.coerce.number().int().min(0))
