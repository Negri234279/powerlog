import { Field, Float, ID, InputType, Int } from '@nestjs/graphql'
import { z } from 'zod'

const uuid = z.string().uuid()
const notes = z.string().trim().max(2000).nullable().optional()

// ── programmed set ──────────────────────────────────────────────────────
@InputType()
export class TemplateSetInput {
    @Field(() => String, { nullable: true, description: 'Weight unit of the inputs: kg | lb (default kg).' })
    unit?: string | null

    @Field(() => Float, { nullable: true })
    plannedWeight?: number | null

    @Field(() => Int, { nullable: true })
    plannedReps?: number | null

    @Field(() => Float, { nullable: true, description: 'Target RPE 0–10 in half-point steps.' })
    rpe?: number | null

    @Field(() => Int, { nullable: true, description: 'Target reps in reserve (alternative to RPE).' })
    rir?: number | null

    @Field(() => String, { nullable: true })
    notes?: string | null
}

const templateSetSchema = z.object({
    unit: z.enum(['kg', 'lb']).nullable().optional(),
    plannedWeight: z.number().nonnegative().nullable().optional(),
    plannedReps: z.number().int().nullable().optional(),
    rpe: z.number().nullable().optional(),
    rir: z.number().int().nullable().optional(),
    notes,
})

// ── template exercise ───────────────────────────────────────────────────
@InputType()
export class TemplateExerciseInput {
    @Field(() => ID)
    exerciseId!: string

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [TemplateSetInput])
    sets!: TemplateSetInput[]
}

const templateExerciseSchema = z.object({
    exerciseId: uuid,
    notes,
    sets: z.array(templateSetSchema).max(50),
})

// ── template content (create + update share this) ───────────────────────
@InputType()
export class WorkoutTemplateInput {
    @Field()
    name!: string

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [TemplateExerciseInput])
    exercises!: TemplateExerciseInput[]
}

export const workoutTemplateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    notes,
    exercises: z.array(templateExerciseSchema).max(50),
})

// ── create a session from a template ────────────────────────────────────
@InputType()
export class CreateSessionFromTemplateInput {
    @Field(() => ID)
    templateId!: string

    @Field(() => String, { nullable: true, description: 'ISO 8601 datetime; defaults to now.' })
    performedAt?: string | null

    @Field(() => String, { nullable: true })
    notes?: string | null
}

export const createSessionFromTemplateSchema = z.object({
    templateId: uuid,
    performedAt: z.string().datetime().nullable().optional(),
    notes,
})

// ── coach plans a session from a template for an athlete ─────────────────
@InputType()
export class PlanSessionFromTemplateInput {
    @Field(() => ID, { description: 'The athlete this session is planned for.' })
    athleteId!: string

    @Field(() => ID)
    templateId!: string

    @Field(() => String, { nullable: true, description: 'ISO 8601 datetime; defaults to now.' })
    performedAt?: string | null

    @Field(() => String, { nullable: true })
    notes?: string | null
}

export const planSessionFromTemplateSchema = z.object({
    athleteId: uuid,
    templateId: uuid,
    performedAt: z.string().datetime().nullable().optional(),
    notes,
})
