/**
 * Cross-module read contract: lets the AI module gather everything it needs to
 * prescribe the sets of a planned session — the session's exercises and each
 * one's recent performance — without importing the workouts module. The
 * implementation dispatches a `GetSessionPlanContextQuery` over the QueryBus
 * (global via `CqrsModule.forRoot`), so the two modules stay decoupled. Mirrors
 * `ProfileSnapshotReader`. Lives in the shared kernel so neither side crosses a
 * module boundary.
 *
 * Weights are kilograms throughout: that is how they are stored, and converting
 * for the model would only add a rounding step and a chance to get it wrong.
 */

/**
 * A set as currently programmed in the planned session (targets, no results).
 *
 * Targets can be ranges (`5-8`), but the model is handed a single number — the
 * floor of the range — and prescribes single numbers back. Teaching it to read
 * and write ranges is a separate change; until then this stays the narrow
 * contract it has always been rather than a half-migrated one.
 */
export interface PlannedSetContext {
    setId: string
    order: number
    plannedWeightKg: number | null
    plannedReps: number | null
    rpe: number | null
    rir: number | null
    notes: string | null
}

/** A set the athlete actually performed in a past session. */
export interface PerformedSetContext {
    weightKg: number
    reps: number
    rpe: number | null
    rir: number | null
    e1rmKg: number | null
    notes: string | null
}

/** One past completed session that included the exercise. */
export interface ExerciseHistoryContext {
    performedAt: Date
    sessionNotes: string | null
    exerciseNotes: string | null
    sets: PerformedSetContext[]
}

/** One exercise of the planned session, with the history that should drive it. */
export interface ExercisePlanContext {
    exerciseId: string
    entryId: string
    /** The exercise's canonical (English) name — the model needs to know the lift. */
    name: string
    entryNotes: string | null
    /** The sets to prescribe, in order. */
    sets: PlannedSetContext[]
    /** Recent completed sessions with this exercise, newest first. */
    history: ExerciseHistoryContext[]
}

/** Everything the model is given about a session it is asked to program. */
export interface SessionPlanContext {
    sessionId: string
    /**
     * Who will lift it — the session's owner, whose history anchors the loads.
     * The AI gate also reads it to pick which plan pays: programming your own
     * session draws on the athlete plan, programming an athlete's on the coach plan.
     */
    ownerId: string
    performedAt: Date
    sessionNotes: string | null
    exercises: ExercisePlanContext[]
}

export abstract class SessionPlanContextReader {
    /**
     * Gathers the context for a session the user owns, or returns null when it
     * does not exist, is not theirs, or is not still `planned` — a completed
     * session has nothing left to program.
     *
     * `entryId` narrows it to one exercise of the session; omit it for all of them.
     * An entry that isn't in the session yields an empty exercise list, not a
     * different session's data.
     */
    abstract read(userId: string, sessionId: string, entryId?: string): Promise<SessionPlanContext | null>
}
