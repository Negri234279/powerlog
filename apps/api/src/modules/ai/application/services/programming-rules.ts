import type { CatalogExercise } from '../../../../shared/contracts/mesocycle-design-context'
import type { DraftMesocycleDay, MesocycleDraftProposal } from '../../domain/entities/ai-mesocycle-draft.entity'
import { ModelAnswerRejection } from './model-answer'
import {
    CONSECUTIVE_DAY_HIGH_VOLUME,
    ISOLATION_FIRST_CATEGORIES,
    PULL_MUSCLES,
    PUSH_MUSCLES,
    PUSH_PULL_BALANCE,
    SESSION_DURATION,
    type TrainingObjective,
    WEEKLY_SETS_PER_MUSCLE,
} from './programming-rules.config'

/**
 * The non-blocking rule ids, a bounded set so `powerlog_ai_rule_warning_total`
 * stays low-cardinality. A warning names something a coach would raise an eyebrow
 * at, not something worth spending a retry on.
 */
export const RULE_WARNINGS = ['weekly_volume_low', 'push_pull_coverage', 'muscle_frequency', 'pattern_overlap'] as const
export type RuleWarning = (typeof RULE_WARNINGS)[number]

/** One exercise reduced to what the rules reason about. */
interface Resolved {
    category: string
    primaryMuscle: string
    sets: number
}

interface ResolvedDay {
    dayOffset: number
    exercises: Resolved[]
}

/**
 * Deterministic training checks on a parsed week, run **after** the structural
 * parser and **before** the proposal is returned. Hard violations throw
 * `ModelAnswerRejection` — reusing the one-shot retry the parser already leans on,
 * so the model is told what is wrong and gets one chance to fix it. Soft ones come
 * back as `warnings` for the caller to count.
 *
 * Pure and provider-free: everything it needs is the parsed week plus the
 * catalog's taxonomy, which is exactly what the parser was already given.
 */
export function evaluateMesocycleRules(
    proposal: MesocycleDraftProposal,
    catalog: ReadonlyMap<string, CatalogExercise>,
    opts: { objective: TrainingObjective },
): { warnings: RuleWarning[] } {
    const days = resolveDays(proposal.days, catalog)
    const setsByMuscle = weeklySetsByMuscle(days)

    // Hard rules first: the first one that fails is the reason the model is handed.
    assertMuscleVolumeUnderCeiling(setsByMuscle, opts.objective)
    assertPushPullNotGrosslyImbalanced(setsByMuscle)
    assertHeavyCompoundFirst(days)
    assertSessionsWithinDurationCeiling(days)

    const warnings = new Set<RuleWarning>()
    collectVolumeFloorWarnings(setsByMuscle, opts.objective, warnings)
    collectPushPullSkewWarnings(setsByMuscle, warnings)
    collectConsecutiveDayWarnings(days, warnings)
    collectPatternOverlapWarnings(days, warnings)

    return { warnings: [...warnings] }
}

function resolveDays(days: readonly DraftMesocycleDay[], catalog: ReadonlyMap<string, CatalogExercise>): ResolvedDay[] {
    return days.map((day) => ({
        dayOffset: day.dayOffset,
        exercises: day.exercises.flatMap((exercise) => {
            const known = catalog.get(exercise.slug)
            // The parser already rejected unknown slugs; skip defensively rather
            // than throw a second, less useful rejection for the same cause.
            if (!known) return []

            return [{ category: known.category, primaryMuscle: known.primaryMuscle, sets: exercise.sets.length }]
        }),
    }))
}

function weeklySetsByMuscle(days: readonly ResolvedDay[]): Map<string, number> {
    const totals = new Map<string, number>()
    for (const day of days) {
        for (const exercise of day.exercises) {
            totals.set(exercise.primaryMuscle, (totals.get(exercise.primaryMuscle) ?? 0) + exercise.sets)
        }
    }

    return totals
}

function sumSides(setsByMuscle: Map<string, number>): { push: number; pull: number } {
    const sideTotal = (muscles: readonly string[]) =>
        muscles.reduce((total, muscle) => total + (setsByMuscle.get(muscle) ?? 0), 0)

    return { push: sideTotal(PUSH_MUSCLES), pull: sideTotal(PULL_MUSCLES) }
}

function assertMuscleVolumeUnderCeiling(setsByMuscle: Map<string, number>, objective: TrainingObjective): void {
    const { max } = WEEKLY_SETS_PER_MUSCLE[objective]
    for (const [muscle, sets] of setsByMuscle) {
        if (sets > max) {
            throw new ModelAnswerRejection(
                `"${muscle}" is given ${sets} sets this week; keep any single muscle at ${max} or fewer weekly sets and redistribute the volume`,
            )
        }
    }
}

function assertPushPullNotGrosslyImbalanced(setsByMuscle: Map<string, number>): void {
    const { push, pull } = sumSides(setsByMuscle)
    if (push < PUSH_PULL_BALANCE.minSetsForRatio || pull < PUSH_PULL_BALANCE.minSetsForRatio) return

    const ratio = push / pull
    if (ratio < PUSH_PULL_BALANCE.rejectLow || ratio > PUSH_PULL_BALANCE.rejectHigh) {
        throw new ModelAnswerRejection(
            `weekly push volume (${push} sets across chest/shoulders/triceps) and pull volume (${pull} sets across back/lats/biceps) are badly out of balance; bring them closer together`,
        )
    }
}

function assertHeavyCompoundFirst(days: readonly ResolvedDay[]): void {
    for (const day of days) {
        const first = day.exercises[0]
        if (!first) continue

        const hasCompound = day.exercises.some((exercise) => !ISOLATION_FIRST_CATEGORIES.includes(exercise.category))
        if (hasCompound && ISOLATION_FIRST_CATEGORIES.includes(first.category)) {
            throw new ModelAnswerRejection(
                `day ${day.dayOffset} opens with a ${first.category} isolation exercise; lead each day with its heaviest compound movement`,
            )
        }
    }
}

function assertSessionsWithinDurationCeiling(days: readonly ResolvedDay[]): void {
    const { workSecondsPerSet, restSecondsByCategory, defaultRestSeconds, maxSessionSeconds } = SESSION_DURATION
    for (const day of days) {
        const seconds = day.exercises.reduce((total, exercise) => {
            const rest = restSecondsByCategory[exercise.category] ?? defaultRestSeconds

            return total + exercise.sets * (workSecondsPerSet + rest)
        }, 0)

        if (seconds > maxSessionSeconds) {
            throw new ModelAnswerRejection(
                `day ${day.dayOffset} works out to roughly ${Math.round(seconds / 60)} minutes; keep a session under ${Math.round(maxSessionSeconds / 60)} minutes by cutting sets or exercises`,
            )
        }
    }
}

function collectVolumeFloorWarnings(
    setsByMuscle: Map<string, number>,
    objective: TrainingObjective,
    warnings: Set<RuleWarning>,
): void {
    const { min } = WEEKLY_SETS_PER_MUSCLE[objective]
    for (const sets of setsByMuscle.values()) {
        if (sets < min) {
            warnings.add('weekly_volume_low')

            return
        }
    }
}

function collectPushPullSkewWarnings(setsByMuscle: Map<string, number>, warnings: Set<RuleWarning>): void {
    const { push, pull } = sumSides(setsByMuscle)
    const { minSetsForRatio, warnLow, warnHigh } = PUSH_PULL_BALANCE
    const pushThin = push < minSetsForRatio
    const pullThin = pull < minSetsForRatio

    // One side barely trained while the other is substantial: a coverage gap.
    if (pushThin !== pullThin) {
        if (push >= minSetsForRatio * 2 || pull >= minSetsForRatio * 2) warnings.add('push_pull_coverage')

        return
    }
    if (pushThin || pullThin) return

    const ratio = push / pull
    if (ratio < warnLow || ratio > warnHigh) warnings.add('push_pull_coverage')
}

function collectConsecutiveDayWarnings(days: readonly ResolvedDay[], warnings: Set<RuleWarning>): void {
    const byOffset = new Map(days.map((day) => [day.dayOffset, muscleSets(day)]))

    for (const day of days) {
        const next = byOffset.get(day.dayOffset + 1)
        if (!next) continue

        const today = muscleSets(day)
        for (const [muscle, sets] of today) {
            const tomorrow = next.get(muscle) ?? 0
            if (sets >= CONSECUTIVE_DAY_HIGH_VOLUME && tomorrow >= CONSECUTIVE_DAY_HIGH_VOLUME) {
                warnings.add('muscle_frequency')

                return
            }
        }
    }
}

function collectPatternOverlapWarnings(days: readonly ResolvedDay[], warnings: Set<RuleWarning>): void {
    for (const day of days) {
        const seen = new Set<string>()
        for (const exercise of day.exercises) {
            const key = `${exercise.category}:${exercise.primaryMuscle}`
            if (seen.has(key)) {
                warnings.add('pattern_overlap')

                return
            }
            seen.add(key)
        }
    }
}

function muscleSets(day: ResolvedDay): Map<string, number> {
    const totals = new Map<string, number>()
    for (const exercise of day.exercises) {
        totals.set(exercise.primaryMuscle, (totals.get(exercise.primaryMuscle) ?? 0) + exercise.sets)
    }

    return totals
}
