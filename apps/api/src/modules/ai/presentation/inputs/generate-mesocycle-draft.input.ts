import { Field, InputType, Int } from '@nestjs/graphql'
import { z } from 'zod'

import { MESOCYCLE_DRAFT_LIMITS } from '../../domain/entities/ai-mesocycle-draft.entity'

const { weeks, daysPerWeek } = MESOCYCLE_DRAFT_LIMITS

@InputType()
export class GenerateMesocycleDraftInput {
    @Field(() => Int, { description: 'How many weeks the block runs for. The template week is repeated in each.' })
    weeks!: number

    @Field(() => [Int], { description: 'Days trained, as 0–6 offsets from the week start. Monday is 0.' })
    trainingDays!: number[]

    @Field(() => String, { nullable: true, description: 'Free-text goal (e.g. hypertrophy, strength, peak).' })
    goal?: string | null

    @Field(() => String, {
        nullable: true,
        description: 'Anything the model should know, e.g. "squat focus, no hack squat machine".',
    })
    prompt?: string | null
}

/**
 * The structured fields are what decide the *shape* of the block, and they are
 * validated here, before the model ever sees them. `prompt` is the only free text,
 * and it can argue about exercise selection but never about the week's shape —
 * which is what stops a prompt injection from turning a 4-week block into a 52-week
 * one, or from adding training days the athlete never asked for.
 */
export const generateMesocycleDraftSchema = z.object({
    weeks: z.number().int().min(weeks.min).max(weeks.max),
    trainingDays: z
        .array(z.number().int().min(0).max(6))
        .min(daysPerWeek.min)
        .max(daysPerWeek.max)
        .refine((days) => new Set(days).size === days.length, 'trainingDays must not repeat a day')
        // Sorted so the same request always builds the same prompt.
        .transform((days) => [...days].sort((a, b) => a - b)),
    goal: z.string().trim().max(60).nullable().optional(),
    // Long enough for real context, short enough that the prompt stays sane.
    prompt: z.string().trim().min(1).max(1000).nullable().optional(),
})
