import { z } from 'zod'

import type { PlanDraftSet } from '../../domain/entities/ai-plan-draft.entity'

/**
 * Why a model's answer was rejected. Carried back to the model on the retry, so
 * the wording is written for it, not for the athlete — it never reaches a client.
 */
export class PlanResponseRejection extends Error {}

const setSchema = z.object({
    setId: z.string().min(1),
    weightKg: z.number().positive().max(1000).nullish(),
    reps: z.number().int().min(1).max(100).nullish(),
    rpe: z.number().min(1).max(10).nullish(),
    rir: z.number().int().min(0).max(10).nullish(),
    note: z.string().max(200).nullish(),
})

const planSchema = z.object({
    rationale: z.string().min(1).max(4000),
    sets: z.array(setSchema).min(1),
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
 * can act on. The set ids are checked against the ones the model was given: it
 * must prescribe each of them exactly once, and nothing else. That check is what
 * makes the rest of the pipeline safe — a hallucinated set id never gets as far
 * as the database.
 */
export function parsePlanResponse(text: string, expectedSetIds: readonly string[]): ParsedPlan {
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

    const expected = new Set(expectedSetIds)
    const seen = new Set<string>()

    const sets: PlanDraftSet[] = result.data.sets.map((set) => {
        if (!expected.has(set.setId)) throw new PlanResponseRejection(`"${set.setId}" is not one of the given set ids`)
        if (seen.has(set.setId)) throw new PlanResponseRejection(`"${set.setId}" was prescribed twice`)
        seen.add(set.setId)

        const rpe = set.rpe ?? null
        const rir = set.rir ?? null
        if (rpe !== null && rir !== null) {
            throw new PlanResponseRejection(`set "${set.setId}" has both an rpe and an rir; give only one`)
        }

        return {
            setId: set.setId,
            plannedWeightKg: set.weightKg ?? null,
            plannedReps: set.reps ?? null,
            rpe,
            rir,
            notes: set.note ?? null,
        }
    })

    const missing = expectedSetIds.filter((setId) => !seen.has(setId))
    if (missing.length > 0) throw new PlanResponseRejection(`${missing.length} set(s) were left unprescribed`)

    return { rationale: result.data.rationale, sets }
}
