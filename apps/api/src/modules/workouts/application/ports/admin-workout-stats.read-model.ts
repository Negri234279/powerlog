/** Aggregate training figures for the admin dashboard. */
export interface AdminWorkoutStats {
    sessions: number
    completedSessions: number
    sets: number
    /** Exercises in the catalog. */
    exercises: number
    /** Sessions performed in the last 7 days. */
    sessionsLast7Days: number
    /** Distinct users with at least one logged session. */
    activeUsers: number
}

export abstract class AdminWorkoutStatsReadModel {
    abstract read(): Promise<AdminWorkoutStats>
}
