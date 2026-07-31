/**
 * Turns a target of `reps @ intensity` on a known e1RM into real kilograms.
 * Arithmetic the model was doing by prose (`mesocycle-prompt` used to ask it to
 * "prescribe real kilograms as a percentage … rounded to the nearest 2.5 kg"),
 * moved to the backend where it is deterministic, auditable and testable.
 *
 * Pure domain, no dependencies: the caller supplies the e1RM (from the athlete's
 * logged strength) and the exercise's equipment (from the catalog taxonomy). The
 * equipment string mirrors `workouts` `EXERCISE_EQUIPMENT` — re-declared here, not
 * imported, since the AI module cannot reach into another module's domain.
 */

/**
 * Smallest real weight step per equipment, in kilograms. `bodyweight` is `null`:
 * there is no external load to prescribe, so those sets keep a null weight — the
 * same outcome the model used to be told to produce by hand.
 */
export const EQUIPMENT_INCREMENT_KG: Record<string, number | null> = {
    barbell: 2.5,
    dumbbell: 1.25,
    machine: 2.5,
    cable: 2.5,
    bodyweight: null,
}

/**
 * Percentage of 1RM you can lift for N *reps to failure* (RTS-style chart, the
 * RPE-10 column). Intensity below failure is folded in by adding the reps in
 * reserve to the rep count before reading this table. Beyond the last entry the
 * inverse-Epley curve takes over — far from a 1RM the exact number matters less.
 */
const RTF_PERCENT: Record<number, number> = {
    1: 1.0,
    2: 0.955,
    3: 0.922,
    4: 0.892,
    5: 0.863,
    6: 0.837,
    7: 0.811,
    8: 0.786,
    9: 0.762,
    10: 0.739,
    11: 0.717,
    12: 0.694,
}

const RTF_TABLE_MAX = 12

/** Inverse Epley: fraction of 1RM for a set taken to failure at `rtf` reps. */
function epleyFraction(rtf: number): number {
    return 1 / (1 + rtf / 30)
}

/**
 * Fraction of 1RM for a set of `rtf` reps to failure. Interpolates within the
 * chart, holds 100% at or below a single rep, and falls back to Epley past it.
 */
function percentOf1rm(rtf: number): number {
    if (rtf <= 1) return 1.0
    if (rtf > RTF_TABLE_MAX) return epleyFraction(rtf)

    const low = Math.floor(rtf)
    const high = Math.ceil(rtf)
    const lowPct = RTF_PERCENT[low] ?? epleyFraction(low)
    if (low === high) return lowPct

    const highPct = RTF_PERCENT[high] ?? epleyFraction(high)

    return lowPct + (highPct - lowPct) * (rtf - low)
}

/**
 * Reps to failure implied by a target: `reps` plus the reps left in reserve.
 * RPE and RIR are two names for the same reserve (RIR = 10 − RPE); a target that
 * carries neither cannot be turned into a load, so this returns null.
 */
function repsToFailure(reps: number, rpe: number | null, rir: number | null): number | null {
    if (rir !== null) return reps + rir
    if (rpe !== null) return reps + (10 - rpe)

    return null
}

/**
 * Round a weight to the equipment's real increment. Null for a bodyweight
 * movement (no external load) or a non-positive result. Used by the mesocycle
 * expander to keep every week's progressed load on a loadable number.
 */
export function roundToIncrement(weightKg: number, equipment: string): number | null {
    const increment = EQUIPMENT_INCREMENT_KG[equipment]
    if (increment === null || increment === undefined) return null

    const rounded = Math.round(weightKg / increment) * increment

    return rounded > 0 ? rounded : null
}

export interface LoadInput {
    /** The athlete's estimated 1RM on this lift, or null if they have no history. */
    e1rmKg: number | null
    reps: number
    rir: number | null
    rpe: number | null
    /** The exercise's equipment (a value of EXERCISE_EQUIPMENT). */
    equipment: string
}

/**
 * Kilograms for a `reps @ RIR/RPE` target on a known e1RM, rounded to the real
 * increment of the equipment. Returns null when there is nothing to compute from:
 * no e1RM (never guess a weight the athlete has no history on), a bodyweight
 * movement (no external load), or a target with no intensity attached.
 *
 * The result is capped at the e1RM: no prescription ever exceeds a true single.
 */
export function prescribeLoad(input: LoadInput): number | null {
    if (input.e1rmKg === null || input.e1rmKg <= 0) return null

    const increment = EQUIPMENT_INCREMENT_KG[input.equipment]
    if (increment === null || increment === undefined) return null

    const rtf = repsToFailure(input.reps, input.rpe, input.rir)
    if (rtf === null) return null

    const raw = Math.min(input.e1rmKg * percentOf1rm(rtf), input.e1rmKg)
    const rounded = Math.round(raw / increment) * increment

    return rounded > 0 ? rounded : null
}
