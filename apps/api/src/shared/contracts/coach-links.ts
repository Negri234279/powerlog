/**
 * Cross-module contract for checking coach↔athlete links without importing the
 * coaching module. Coaching provides the implementation and exports it; the
 * workouts module (Bloque 5.9) depends on this to authorize coach-planned
 * sessions. Keep it minimal.
 */
export abstract class CoachLinks {
    /** Whether the coach currently coaches the athlete. */
    abstract areLinked(coachId: string, athleteId: string): Promise<boolean>
}
