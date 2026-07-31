import { z } from 'zod'

import type { CatalogExercise } from '../../../../shared/contracts/mesocycle-design-context'
import {
    DEFAULT_PROGRESSION,
    type DraftMesocycleDay,
    MESOCYCLE_DRAFT_LIMITS,
    type MesocycleProgression,
} from '../../domain/entities/ai-mesocycle-draft.entity'
import { MAX_RATIONALE_LENGTH } from './mesocycle-prompt.service'
import { ModelAnswerRejection, parseJsonObject } from './model-answer'

const { daysPerWeek, exercisesPerDay, setsPerExercise } = MESOCYCLE_DRAFT_LIMITS

// No `weightKg`: the model prescribes reps and an intensity target, and the
// backend computes the kilograms from the athlete's e1RM (see `fillMesocycleLoads`
// / `load-calculator`). A stray `weightKg` the model sends anyway is stripped.
const setSchema = z.object({
    reps: z.number().int().min(1).max(100).nullish(),
    rpe: z.number().min(1).max(10).nullish(),
    rir: z.number().int().min(0).max(10).nullish(),
    note: z.string().max(200).nullish(),
})

const exerciseSchema = z.object({
    slug: z.string().min(1),
    notes: z.string().max(200).nullish(),
    sets: z.array(setSchema).min(setsPerExercise.min).max(setsPerExercise.max),
})

const daySchema = z.object({
    dayOffset: z.number().int().min(0).max(6),
    label: z.string().max(60).nullish(),
    exercises: z.array(exerciseSchema).min(exercisesPerDay.min).max(exercisesPerDay.max),
})

/**
 * The declarative progression the backend expands into the block's weeks (IA.7).
 * Every field defaults, and the whole object defaults to the neutral progression,
 * so a model that omits it (or omits a field) yields the pre-IA.7 behaviour rather
 * than a rejection. Structural bounds only — the training-quality checks live in
 * the programming rules and the aggregate.
 */
const progressionSchema = z
    .object({
        model: z.enum(['linear_percent', 'double_progression', 'rpe_ramp']).default('linear_percent'),
        weeklyIntensityStepPct: z.number().min(0).max(20).default(0),
        weeklySetIncrement: z.number().int().min(0).max(3).default(0),
        deloadWeeks: z.array(z.number().int().min(0).max(51)).default([]),
        deloadFactor: z.number().min(0.1).max(1).default(1),
    })
    .default(() => ({ ...DEFAULT_PROGRESSION }))

/**
 * The only shape an answer may take. `rationale` is the single free-text field
 * that ever reaches the athlete, and it is capped: a model argued into writing
 * an essay has nowhere to put it.
 */
const weekSchema = z.object({
    name: z.string().trim().min(1).max(100),
    rationale: z.string().trim().min(1).max(MAX_RATIONALE_LENGTH),
    days: z.array(daySchema).min(daysPerWeek.min).max(daysPerWeek.max),
    progression: progressionSchema,
})

/**
 * The template week the model designed, plus the progression to expand it by. The
 * backend fills the loads (IA.5) and expands to microcycles (IA.7) — the parser
 * stays the structural trust boundary and does neither.
 */
export interface ParsedMesocycle {
    rationale: string
    name: string
    days: DraftMesocycleDay[]
    progression: MesocycleProgression
}

/**
 * Turns the model's answer into a proposed training week, or rejects it with a
 * reason the model can act on.
 *
 * Two checks carry the weight. Every `slug` is looked up in the catalog the model
 * was given, so a hallucinated lift never reaches a draft — and the catalog's own
 * `exerciseId` and canonical name are what get stored, not the model's. And the
 * days must be exactly the ones the athlete asked to train: the model may argue
 * about which exercises go in a week, never about the shape of the week.
 */
export function parseMesocycleResponse(
    text: string,
    catalog: ReadonlyMap<string, CatalogExercise>,
    trainingDays: readonly number[],
): ParsedMesocycle {
    const result = weekSchema.safeParse(parseJsonObject(text))
    if (!result.success) {
        const issue = result.error.issues[0]
        const path = issue?.path.join('.') || '(root)'
        throw new ModelAnswerRejection(`${path}: ${issue?.message ?? 'invalid'}`)
    }

    const requested = new Set(trainingDays)
    const seen = new Set<number>()
    const days: DraftMesocycleDay[] = []

    for (const day of result.data.days) {
        if (!requested.has(day.dayOffset)) {
            throw new ModelAnswerRejection(`dayOffset ${day.dayOffset} was not one of the trainingDays you were given`)
        }
        if (seen.has(day.dayOffset)) {
            throw new ModelAnswerRejection(`dayOffset ${day.dayOffset} was programmed twice`)
        }
        seen.add(day.dayOffset)

        days.push({
            dayOffset: day.dayOffset,
            label: day.label ?? null,
            exercises: day.exercises.map((exercise) => {
                const known = catalog.get(exercise.slug)
                if (!known) throw new ModelAnswerRejection(`"${exercise.slug}" is not an exercise in the catalog`)

                return {
                    exerciseId: known.exerciseId,
                    slug: known.slug,
                    name: known.name,
                    notes: exercise.notes ?? null,
                    sets: exercise.sets.map((set, index) => {
                        const rpe = set.rpe ?? null
                        const rir = set.rir ?? null
                        if (rpe !== null && rir !== null) {
                            throw new ModelAnswerRejection(
                                `set ${index + 1} of "${exercise.slug}" has both an rpe and an rir; give only one`,
                            )
                        }

                        return {
                            order: index + 1,
                            // Filled by the backend from the athlete's e1RM; the
                            // model no longer prescribes a weight.
                            plannedWeightKg: null,
                            plannedReps: set.reps ?? null,
                            rpe,
                            rir,
                            notes: set.note ?? null,
                        }
                    }),
                }
            }),
        })
    }

    const missing = trainingDays.filter((dayOffset) => !seen.has(dayOffset))
    if (missing.length > 0)
        throw new ModelAnswerRejection(`${missing.length} of the trainingDays were left unprogrammed`)

    return {
        rationale: result.data.rationale,
        name: result.data.name,
        days,
        progression: result.data.progression,
    }
}
