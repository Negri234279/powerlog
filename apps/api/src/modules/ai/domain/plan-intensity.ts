import { ConflictingPlanIntensityError } from './errors/ai-plan.errors'

/** Anything the model prescribes carries at most one of the two intensity scales. */
interface IntensityBearing {
    rpe: number | null
    rir: number | null
}

/**
 * RPE and RIR are two ways of saying the same thing, and workouts rejects a set
 * that carries both. Catching it in the domain means a bad model answer fails
 * while it is still a proposal, rather than at the moment the athlete takes it.
 *
 * Shared by both draft aggregates: a session plan and a mesocycle template
 * prescribe the same kind of set.
 */
export function assertIntensityIsUnambiguous(sets: readonly IntensityBearing[]): void {
    if (sets.some((set) => set.rpe !== null && set.rir !== null)) {
        throw new ConflictingPlanIntensityError()
    }
}
