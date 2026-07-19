/**
 * Cross-module read contract: a user's training activity as an admin needs to see
 * it — how much they've logged and when they were last active — without importing
 * the workouts module. Workouts provides the implementation and dispatches over
 * the QueryBus.
 */
export interface UserTrainingSummary {
    /** Sessions of any status (planned + logged + completed). */
    sessions: number
    completedSessions: number
    /** Sets logged across all the user's sessions. */
    sets: number
    /** Distinct exercises the user has trained. */
    distinctExercises: number
    /** When the user last trained (most recent session), or null if never. */
    lastSessionAt: Date | null
    /** Sessions in the last 30 days — a quick read on whether they're active. */
    sessionsLast30Days: number
}

export abstract class UserTrainingReader {
    abstract read(userId: string): Promise<UserTrainingSummary>
}
