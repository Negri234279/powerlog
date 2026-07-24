import type { WorkoutStatus } from '../../domain/workout-status'

/** Filter for the per-exercise session history: always user-scoped. */
export interface ExerciseSessionHistoryFilter {
    userId: string
    exerciseId: string
    /** Session to exclude (the one being viewed) so it never lists itself. */
    excludeSessionId?: string
    /** Max number of past sessions to return (newest first). */
    limit: number
}

/** One logged set of a past session, in the order it was performed. Weights are kg. */
export interface ExerciseSessionHistorySet {
    /** Programmed targets (optional), each as the bounds of its range. */
    plannedWeightKgMin: number | null
    plannedWeightKgMax: number | null
    plannedRepsMin: number | null
    plannedRepsMax: number | null
    weightKg: number
    reps: number
    rpe: number | null
    rir: number | null
    e1rmKg: number | null
    /** What the athlete wrote about this set ("felt heavy", "belt on"). */
    notes: string | null
}

/** One past session that included the exercise, with its logged (actual) sets. */
export interface ExerciseSessionHistoryRow {
    sessionId: string
    performedAt: Date
    status: WorkoutStatus
    sets: ExerciseSessionHistorySet[]
    /** The session's own note. */
    sessionNotes: string | null
    /**
     * Notes on the exercise entries for this exercise in that session. A session
     * may hold the same exercise more than once (e.g. a top set and back-offs as
     * separate entries), so distinct notes are joined rather than picked from one.
     */
    exerciseNotes: string | null
}

/**
 * Read-only port: the caller's recent completed sessions that logged a given
 * exercise, each with its performed sets — so the athlete can see previous marks
 * while training. Aggregated directly in SQL (json per session); infra provides
 * the Drizzle impl.
 */
export abstract class ExerciseSessionHistoryReadModel {
    abstract forExercise(filter: ExerciseSessionHistoryFilter): Promise<ExerciseSessionHistoryRow[]>
}
