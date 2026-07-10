/**
 * Cross-module write contract: lets the AI module hand an accepted plan back to
 * workouts, which is the authority on it. The implementation dispatches an
 * `ApplySessionPlanCommand` over the CommandBus, so failures surface to the
 * caller (unlike a fire-and-forget event) and the draft is only marked accepted
 * once the write succeeded. Mirrors `ProfileProvisioner`.
 *
 * Sets are addressed **positionally within an exercise entry**, because the
 * model decides how many working sets a day should have: position `n` fills the
 * entry's nth existing set, and positions past the end create new planned sets.
 * The plan never deletes or reorders anything the athlete already has, only
 * fills targets in — and it cannot touch a session that is no longer `planned`.
 */
export interface PrescribedSet {
    /** The exercise entry this set belongs to. */
    entryId: string
    /** 1-based position within the entry. */
    order: number
    plannedWeightKg: number | null
    plannedReps: number | null
    rpe: number | null
    rir: number | null
    /** Short rationale the athlete sees on the set; null leaves the note alone. */
    notes: string | null
}

export interface SessionPlanInput {
    userId: string
    sessionId: string
    sets: PrescribedSet[]
}

export abstract class SessionPlanApplier {
    abstract apply(input: SessionPlanInput): Promise<void>
}
