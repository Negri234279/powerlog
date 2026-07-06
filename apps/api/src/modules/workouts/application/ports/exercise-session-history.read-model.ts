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
    weightKg: number
    reps: number
    rpe: number | null
    rir: number | null
    e1rmKg: number | null
}

/** One past session that included the exercise, with its logged (actual) sets. */
export interface ExerciseSessionHistoryRow {
    sessionId: string
    performedAt: Date
    status: WorkoutStatus
    sets: ExerciseSessionHistorySet[]
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
