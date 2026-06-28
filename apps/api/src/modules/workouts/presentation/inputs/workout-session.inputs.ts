import { Field, Float, ID, InputType, Int } from '@nestjs/graphql'
import { z } from 'zod'

const uuid = z.string().uuid()
const notes = z.string().trim().max(2000).nullable().optional()

// ── create session ──────────────────────────────────────────────────────
@InputType()
export class CreateWorkoutSessionInput {
    @Field(() => String, { nullable: true, description: 'ISO 8601 datetime; defaults to now.' })
    performedAt?: string | null

    @Field(() => String, { nullable: true })
    notes?: string | null
}

export const createWorkoutSessionSchema = z
    .object({
        performedAt: z.string().datetime().nullable().optional(),
        notes,
    })
    .optional()

// ── update session (date / notes) ───────────────────────────────────────
@InputType()
export class UpdateWorkoutSessionInput {
    @Field(() => ID)
    sessionId!: string

    @Field(() => String, { nullable: true, description: 'ISO 8601 datetime; absent = leave unchanged.' })
    performedAt?: string | null

    @Field(() => String, { nullable: true, description: 'Absent = leave unchanged; null = clear.' })
    notes?: string | null
}

export const updateWorkoutSessionSchema = z.object({
    sessionId: uuid,
    performedAt: z.string().datetime().optional(),
    notes,
})

// ── plan session (coach → athlete) ──────────────────────────────────────
@InputType()
export class PlanWorkoutSessionInput {
    @Field(() => ID, { description: 'The athlete this session is planned for.' })
    athleteId!: string

    @Field(() => String, { nullable: true, description: 'ISO 8601 datetime; defaults to now.' })
    performedAt?: string | null

    @Field(() => String, { nullable: true })
    notes?: string | null
}

export const planWorkoutSessionSchema = z.object({
    athleteId: uuid,
    performedAt: z.string().datetime().nullable().optional(),
    notes,
})

// ── add exercise entry ──────────────────────────────────────────────────
@InputType()
export class AddExerciseEntryInput {
    @Field(() => ID)
    sessionId!: string

    @Field(() => ID)
    exerciseId!: string

    @Field(() => String, { nullable: true })
    notes?: string | null
}

export const addExerciseEntrySchema = z.object({
    sessionId: uuid,
    exerciseId: uuid,
    notes,
})

// ── set fields (shared by logSet / updateSet) ───────────────────────────
const setFields = {
    unit: z.enum(['kg', 'lb']).nullable().optional(),
    plannedWeight: z.number().nonnegative().nullable().optional(),
    plannedReps: z.number().int().nullable().optional(),
    weight: z.number().nonnegative().nullable().optional(),
    reps: z.number().int().nullable().optional(),
    rpe: z.number().nullable().optional(),
    rir: z.number().int().nullable().optional(),
    notes,
}

@InputType()
class SetFieldsInput {
    @Field(() => String, { nullable: true, description: 'Weight unit of the inputs: kg | lb (default kg).' })
    unit?: string | null

    @Field(() => Float, { nullable: true })
    plannedWeight?: number | null

    @Field(() => Int, { nullable: true })
    plannedReps?: number | null

    @Field(() => Float, { nullable: true })
    weight?: number | null

    @Field(() => Int, { nullable: true })
    reps?: number | null

    @Field(() => Float, { nullable: true, description: 'RPE 0–10 in half-point steps.' })
    rpe?: number | null

    @Field(() => Int, { nullable: true, description: 'Reps in reserve (alternative to RPE).' })
    rir?: number | null

    @Field(() => String, { nullable: true })
    notes?: string | null
}

@InputType()
export class LogSetInput extends SetFieldsInput {
    @Field(() => ID)
    sessionId!: string

    @Field(() => ID)
    entryId!: string
}

export const logSetSchema = z.object({ sessionId: uuid, entryId: uuid, ...setFields })

@InputType()
export class UpdateSetInput extends SetFieldsInput {
    @Field(() => ID)
    sessionId!: string

    @Field(() => ID)
    entryId!: string

    @Field(() => ID)
    setId!: string
}

export const updateSetSchema = z.object({ sessionId: uuid, entryId: uuid, setId: uuid, ...setFields })
