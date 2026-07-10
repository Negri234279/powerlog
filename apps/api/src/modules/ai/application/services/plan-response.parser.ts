import { z } from 'zod'

import type { PlanDraftSet } from '../../domain/entities/ai-plan-draft.entity'

/**
 * Why a model's answer was rejected. Carried back to the model on the retry, so
 * the wording is written for it, not for the athlete — it never reaches a client.
 */
export class PlanResponseRejection extends Error {}

/** More than this per exercise reads as the model looping, not programming. */
const MAX_SETS_PER_EXERCISE = 8

const setSchema = z.object({
    weightKg: z.number().positive().max(1000).nullish(),
    reps: z.number().int().min(1).max(100).nullish(),
    rpe: z.number().min(1).max(10).nullish(),
    rir: z.number().int().min(0).max(10).nullish(),
    note: z.string().max(200).nullish(),
})

const exerciseSchema = z.object({
    entryId: z.string().min(1),
    sets: z.array(setSchema).min(1).max(MAX_SETS_PER_EXERCISE),
})

const planSchema = z.object({
    rationale: z.string().min(1).max(4000),
    exercises: z.array(exerciseSchema).min(1),
})

export interface ParsedPlan {
    rationale: string
    sets: PlanDraftSet[]
}

/**
 * Models are told to answer with bare JSON, and mostly do — but they also like
 * to wrap it in a code fence or add a sentence first. Rather than fail on that,
 * take the outermost braces.
 */
function extractJson(text: string): string {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end <= start) throw new PlanResponseRejection('the answer contained no JSON object')

    return text.slice(start, end + 1)
}

/**
 * Turns the model's answer into a plan, or rejects it with a reason the model
 * can act on. The entry ids are checked against the ones the model was given:
 * it must program each exercise exactly once, and nothing else — a hallucinated
 * entry never gets as far as the database. Within an exercise the model owns
 * the set count (that is the point); positions are assigned by array order, so
 * it cannot fumble them either.
 */
export function parsePlanResponse(text: string, expectedEntryIds: readonly string[]): ParsedPlan {
    let raw: unknown
    try {
        raw = JSON.parse(extractJson(text))
    } catch (error) {
        if (error instanceof PlanResponseRejection) throw error
        throw new PlanResponseRejection('the JSON object was malformed')
    }

    const result = planSchema.safeParse(raw)
    if (!result.success) {
        const issue = result.error.issues[0]
        const path = issue?.path.join('.') || '(root)'
        throw new PlanResponseRejection(`${path}: ${issue?.message ?? 'invalid'}`)
    }

    const expected = new Set(expectedEntryIds)
    const seen = new Set<string>()
    const sets: PlanDraftSet[] = []

    for (const exercise of result.data.exercises) {
        if (!expected.has(exercise.entryId)) {
            throw new PlanResponseRejection(`"${exercise.entryId}" is not one of the given entryId values`)
        }
        if (seen.has(exercise.entryId)) {
            throw new PlanResponseRejection(`exercise "${exercise.entryId}" was programmed twice`)
        }
        seen.add(exercise.entryId)

        exercise.sets.forEach((set, index) => {
            const rpe = set.rpe ?? null
            const rir = set.rir ?? null
            if (rpe !== null && rir !== null) {
                throw new PlanResponseRejection(
                    `set ${index + 1} of "${exercise.entryId}" has both an rpe and an rir; give only one`,
                )
            }

            sets.push({
                entryId: exercise.entryId,
                order: index + 1,
                plannedWeightKg: set.weightKg ?? null,
                plannedReps: set.reps ?? null,
                rpe,
                rir,
                notes: set.note ?? null,
            })
        })
    }

    const missing = expectedEntryIds.filter((entryId) => !seen.has(entryId))
    if (missing.length > 0) throw new PlanResponseRejection(`${missing.length} exercise(s) were left unprogrammed`)

    return { rationale: result.data.rationale, sets }
}
