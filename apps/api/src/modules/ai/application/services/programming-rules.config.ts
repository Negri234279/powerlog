/**
 * Training-policy thresholds the mesocycle validator checks a proposed week
 * against, and the same numbers the system prompt quotes to the model. One source
 * of truth: if the validator wants 8–30 weekly sets on a muscle, the prompt must
 * ask for that range, or the model and the rules would be arguing past each other.
 *
 * The bounds start **wide on purpose**. `AiConversation.ask` retries only once, so
 * an over-strict rule turns every generation into two provider calls and then a
 * hard failure. The plan (IA.2) is to open wide and tighten from the
 * `powerlog_ai_rule_warning_total` data, never the reverse.
 *
 * The category/muscle literals mirror `workouts` `EXERCISE_CATEGORIES` /
 * `EXERCISE_MUSCLES`. They are re-declared here rather than imported: the boundary
 * rule forbids the AI module from reaching into another module's domain, and the
 * catalog already hands these fields over as plain `string`s. Keep them in sync.
 */

/** The programming style a free-text goal resolves to. Drives the volume floor. */
export type TrainingObjective = 'strength' | 'hypertrophy' | 'general'

/** Muscles that count toward the push side of the push/pull balance. */
export const PUSH_MUSCLES: readonly string[] = ['chest', 'shoulders', 'triceps']
/** Muscles that count toward the pull side. */
export const PULL_MUSCLES: readonly string[] = ['back', 'lats', 'biceps']

/** Categories that are never a valid *first* exercise when a day has a compound. */
export const ISOLATION_FIRST_CATEGORIES: readonly string[] = ['arms', 'core']

/**
 * Weekly sets on a single trained muscle. The floor is a **warning** (an
 * under-dosed muscle is worth surfacing, not worth a retry); the ceiling is a
 * **rejection** (a week piling 30+ sets on one muscle is a programming error the
 * model can fix). The floor rises with the objective; the ceiling is shared.
 */
export const WEEKLY_SETS_PER_MUSCLE: Record<TrainingObjective, { min: number; max: number }> = {
    strength: { min: 5, max: 30 },
    hypertrophy: { min: 8, max: 30 },
    general: { min: 6, max: 30 },
}

/**
 * Push/pull balance. Both sides are compared only once each carries at least
 * `minSetsForRatio` sets — below that a 2–3 day block legitimately trains one
 * side, and a ratio would be noise. With both sides present, a ratio outside
 * `[rejectLow, rejectHigh]` is a **rejection**; a milder skew is a **warning**.
 */
export const PUSH_PULL_BALANCE = {
    minSetsForRatio: 4,
    rejectLow: 0.5,
    rejectHigh: 2.0,
    warnLow: 0.67,
    warnHigh: 1.5,
} as const

/**
 * Estimated session length. Each set costs its working time plus the rest that
 * follows, and rest scales with how heavy the category is. The ceiling is a
 * **rejection** and is set high — this is a guard against a day with 40 sets, not
 * a nudge toward brevity. An unknown category falls back to `defaultRestSeconds`.
 */
export const SESSION_DURATION = {
    workSecondsPerSet: 40,
    defaultRestSeconds: 120,
    /** Rest after a set, by the exercise's category. */
    restSecondsByCategory: {
        squat: 210,
        bench: 180,
        deadlift: 210,
        chest: 120,
        back: 120,
        shoulders: 120,
        legs: 150,
        arms: 75,
        core: 60,
    } as Record<string, number>,
    /** A day estimated longer than this (in seconds) is rejected. ~2.5 h. */
    maxSessionSeconds: 9000,
} as const

/** A muscle trained on consecutive days with at least this many sets on each. */
export const CONSECUTIVE_DAY_HIGH_VOLUME = 6

/**
 * Map an athlete's free-text goal onto a training objective. Keyword match, with
 * `general` as the wide default — the goal field is free text (`e.g. hypertrophy,
 * strength, peak`), so anything unrecognised gets the middle-of-the-road floor.
 */
export function goalToObjective(goal: string | null): TrainingObjective {
    if (!goal) return 'general'
    const text = goal.toLowerCase()

    if (/\b(strength|fuerza|power|potencia|peak|pico|1rm|powerlifting)\b/.test(text)) return 'strength'
    if (/\b(hypertrophy|hipertrofia|mass|masa|size|tama|build|volumen|bodybuilding)\b/.test(text)) return 'hypertrophy'

    return 'general'
}
