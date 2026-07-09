/**
 * Cross-module write contract: lets the AI module hand an accepted plan back to
 * workouts, which is the authority on it. The implementation dispatches an
 * `ApplySessionPlanCommand` over the CommandBus, so failures surface to the
 * caller (unlike a fire-and-forget event) and the draft is only marked accepted
 * once the write succeeded. Mirrors `ProfileProvisioner`.
 *
 * The plan only ever fills in *targets* on sets that already exist: the AI
 * cannot add, remove or reorder sets, and cannot touch a session that is no
 * longer `planned`. Sets are addressed by their id, so a plan built against a
 * session the user has since edited is rejected rather than applied to the wrong
 * set.
 */
export interface PrescribedSet {
    setId: string
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
