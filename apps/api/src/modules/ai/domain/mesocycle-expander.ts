import type {
    DraftMesocycleDay,
    DraftMesocycleExercise,
    DraftMesocycleSet,
    DraftMicrocycle,
    MesocycleProgression,
} from './entities/ai-mesocycle-draft.entity'
import { prescribeLoad, roundToIncrement } from './load-calculator'

/**
 * Expands a template week into the block's microcycles by applying a declarative
 * progression — the backend's job, not the model's (IA.7). Writing every week out
 * would cost the model output tokens and its arithmetic consistency; here it is
 * deterministic, auditable and testable without a provider.
 *
 * The template week already carries the base loads computed in IA.5. Progression
 * scales from there: `linear_percent` climbs the load, `double_progression` adds
 * reps, `rpe_ramp` climbs the intensity and recomputes the load from the e1RM.
 * Deload weeks trim volume by `deloadFactor` and hold the base load.
 */

/** Per-slug taxonomy + strength the expander needs to progress loads correctly. */
export interface ExpansionContext {
    e1rmBySlug: ReadonlyMap<string, number>
    equipmentBySlug: ReadonlyMap<string, string>
    categoryBySlug: ReadonlyMap<string, string>
}

/** Categories the weekly set increment does NOT apply to (accessories). */
const ISOLATION_CATEGORIES = new Set(['arms', 'core'])

/** Rep/RPE steps are capped so a long block never drifts into absurd targets. */
const MAX_REP_STEP = 4

export function expandMicrocycles(
    template: readonly DraftMesocycleDay[],
    progression: MesocycleProgression,
    weeks: number,
    context: ExpansionContext,
): DraftMicrocycle[] {
    const deloads = new Set(progression.deloadWeeks)

    return Array.from({ length: weeks }, (_, index) => {
        const isDeload = deloads.has(index)
        const step = workingWeeksBefore(index, deloads)

        return {
            index,
            isDeload,
            days: template.map((day) => ({
                ...day,
                exercises: day.exercises.map((exercise) =>
                    expandExercise(exercise, { isDeload, step, progression, context }),
                ),
            })),
        }
    })
}

/** How many non-deload weeks precede `index` — the load's progression step. */
function workingWeeksBefore(index: number, deloads: ReadonlySet<number>): number {
    let count = 0
    for (let week = 0; week < index; week++) {
        if (!deloads.has(week)) count++
    }

    return count
}

interface WeekParams {
    isDeload: boolean
    step: number
    progression: MesocycleProgression
    context: ExpansionContext
}

function expandExercise(exercise: DraftMesocycleExercise, params: WeekParams): DraftMesocycleExercise {
    const { isDeload, step, progression, context } = params
    const equipment = context.equipmentBySlug.get(exercise.slug) ?? 'bodyweight'
    const e1rmKg = context.e1rmBySlug.get(exercise.slug) ?? null
    const category = context.categoryBySlug.get(exercise.slug) ?? ''
    const isMain = !ISOLATION_CATEGORIES.has(category)

    const targetCount = targetSetCount(exercise.sets.length, { isDeload, step, progression, isMain })
    const base = resize(exercise.sets, targetCount)

    return {
        ...exercise,
        sets: base.map((set, position) => ({
            ...progressSet(set, { isDeload, step, progression, equipment, e1rmKg }),
            order: position + 1,
        })),
    }
}

function targetSetCount(
    baseCount: number,
    params: { isDeload: boolean; step: number; progression: MesocycleProgression; isMain: boolean },
): number {
    if (params.isDeload) return Math.max(1, Math.round(baseCount * params.progression.deloadFactor))
    if (params.isMain) return baseCount + params.progression.weeklySetIncrement * params.step

    return baseCount
}

/** Grow (repeat the last set) or shrink the set list to `count`, never below 1. */
function resize(sets: readonly DraftMesocycleSet[], count: number): DraftMesocycleSet[] {
    const target = Math.max(1, count)
    if (target <= sets.length) return sets.slice(0, target).map((set) => ({ ...set }))

    const last = sets[sets.length - 1]
    const filler = Array.from({ length: target - sets.length }, () => ({ ...(last as DraftMesocycleSet) }))

    return [...sets.map((set) => ({ ...set })), ...filler]
}

interface SetParams {
    isDeload: boolean
    step: number
    progression: MesocycleProgression
    equipment: string
    e1rmKg: number | null
}

function progressSet(set: DraftMesocycleSet, params: SetParams): DraftMesocycleSet {
    // A deload holds the base targets and only trims volume (done in the set count).
    if (params.isDeload || params.step === 0) return { ...set }

    switch (params.progression.model) {
        case 'double_progression':
            return progressReps(set, params)
        case 'rpe_ramp':
            return progressIntensity(set, params)
        case 'linear_percent':
        default:
            return progressLoad(set, params)
    }
}

/** Climb the load a fixed % over the base each working week; hold reps/intensity. */
function progressLoad(set: DraftMesocycleSet, params: SetParams): DraftMesocycleSet {
    if (set.plannedWeightKg === null) return { ...set }

    const factor = 1 + (params.progression.weeklyIntensityStepPct / 100) * params.step
    const scaled = roundToIncrement(set.plannedWeightKg * factor, params.equipment)
    const capped = scaled === null ? null : cap(scaled, params.e1rmKg)

    return { ...set, plannedWeightKg: capped }
}

/** Add reps over the base each working week (capped); hold the load. */
function progressReps(set: DraftMesocycleSet, params: SetParams): DraftMesocycleSet {
    if (set.plannedReps === null) return { ...set }

    return { ...set, plannedReps: set.plannedReps + Math.min(params.step, MAX_REP_STEP) }
}

/** Climb the intensity each working week and recompute the load from the e1RM. */
function progressIntensity(set: DraftMesocycleSet, params: SetParams): DraftMesocycleSet {
    const step = Math.min(params.step, MAX_REP_STEP)
    const rpe = set.rpe === null ? null : Math.min(10, set.rpe + step)
    const rir = set.rir === null ? null : Math.max(0, set.rir - step)

    // A recomputed load needs an e1RM and a rep target; otherwise hold the base.
    if (params.e1rmKg === null || set.plannedReps === null) return { ...set, rpe, rir }

    const weight = prescribeLoad({
        e1rmKg: params.e1rmKg,
        reps: set.plannedReps,
        rir,
        rpe,
        equipment: params.equipment,
    })

    return { ...set, rpe, rir, plannedWeightKg: weight }
}

/** Never let a progressed load exceed the athlete's true single. */
function cap(weightKg: number, e1rmKg: number | null): number {
    return e1rmKg === null ? weightKg : Math.min(weightKg, e1rmKg)
}
