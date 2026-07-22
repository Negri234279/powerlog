import { Field, ID, InputType, Int } from '@nestjs/graphql'
import { z } from 'zod'

import { MESOCYCLE_STATUSES } from '../../domain/mesocycle-status'
import { RANGE_DESCRIPTION, rangeText } from './range-input'

const uuid = z.string().uuid()
const notes = z.string().trim().max(2000).nullable().optional()
const label = z.string().trim().max(100).nullable().optional()

// ── programmed set ──────────────────────────────────────────────────────
@InputType()
export class MesocycleDaySetInput {
    @Field(() => String, { nullable: true, description: 'Weight unit of the inputs: kg | lb (default kg).' })
    unit?: string | null

    @Field(() => String, { nullable: true, description: RANGE_DESCRIPTION })
    plannedWeight?: string | null

    @Field(() => String, { nullable: true, description: RANGE_DESCRIPTION })
    plannedReps?: string | null

    @Field(() => String, { nullable: true, description: `Target RPE 0–10 in half-point steps. ${RANGE_DESCRIPTION}` })
    rpe?: string | null

    @Field(() => String, {
        nullable: true,
        description: `Target reps in reserve (alternative to RPE). ${RANGE_DESCRIPTION}`,
    })
    rir?: string | null

    @Field(() => String, { nullable: true })
    notes?: string | null
}

const setSchema = z.object({
    unit: z.enum(['kg', 'lb']).nullable().optional(),
    plannedWeight: rangeText,
    plannedReps: rangeText,
    rpe: rangeText,
    rir: rangeText,
    notes,
})

// ── day exercise ────────────────────────────────────────────────────────
@InputType()
export class MesocycleDayExerciseInput {
    @Field(() => ID)
    exerciseId!: string

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [MesocycleDaySetInput])
    sets!: MesocycleDaySetInput[]
}

const exerciseSchema = z.object({
    exerciseId: uuid,
    notes,
    sets: z.array(setSchema).max(50),
})

// ── microcycle day ──────────────────────────────────────────────────────
@InputType()
export class MicrocycleDayInput {
    @Field(() => Int, { description: '0–6 offset from the week start.' })
    dayOffset!: number

    @Field(() => String, { nullable: true })
    label?: string | null

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [MesocycleDayExerciseInput])
    exercises!: MesocycleDayExerciseInput[]
}

const daySchema = z.object({
    dayOffset: z.number().int().min(0).max(6),
    label,
    notes,
    exercises: z.array(exerciseSchema).max(50),
})

// ── microcycle (week) ───────────────────────────────────────────────────
@InputType()
export class MicrocycleInput {
    @Field(() => String, { nullable: true })
    label?: string | null

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [MicrocycleDayInput])
    days!: MicrocycleDayInput[]
}

const microcycleSchema = z.object({
    label,
    notes,
    days: z.array(daySchema).max(14),
})

// ── mesocycle content (create + update share this) ──────────────────────
@InputType()
export class MesocycleInput {
    @Field()
    name!: string

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => String, { nullable: true, description: 'Free-text goal (e.g. hypertrophy, strength, peak).' })
    goal?: string | null

    @Field(() => String, { nullable: true, description: 'ISO date (YYYY-MM-DD) anchoring week 1.' })
    startDate?: string | null

    @Field(() => [MicrocycleInput])
    microcycles!: MicrocycleInput[]
}

export const mesocycleSchema = z.object({
    name: z.string().trim().min(1).max(100),
    notes,
    goal: z.string().trim().max(60).nullable().optional(),
    startDate: z.string().date().nullable().optional(),
    microcycles: z.array(microcycleSchema).max(52),
})

// ── set status ──────────────────────────────────────────────────────────
export const mesocycleStatusSchema = z.enum(MESOCYCLE_STATUSES)

// ── generate a week into planned sessions ───────────────────────────────
@InputType()
export class GenerateMesocycleWeekInput {
    @Field(() => ID)
    mesocycleId!: string

    @Field(() => Int, { description: '1-based week to generate.' })
    week!: number

    @Field(() => String, {
        nullable: true,
        description: 'ISO date (YYYY-MM-DD) overriding the mesocycle start date as the anchor.',
    })
    weekStartDate?: string | null

    @Field(() => Boolean, { nullable: true, description: 'Replace the week’s still-planned sessions if it exists.' })
    replace?: boolean | null
}

export const generateMesocycleWeekSchema = z.object({
    mesocycleId: uuid,
    week: z.number().int().min(1).max(52),
    weekStartDate: z.string().date().nullable().optional(),
    replace: z.boolean().nullable().optional(),
})
