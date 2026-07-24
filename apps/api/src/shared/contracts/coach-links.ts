/**
 * Cross-module contract for checking coach↔athlete links without importing the
 * coaching module. Coaching provides the implementation and exports it; the
 * workouts module (Bloque 5.9) depends on this to authorize coach-planned
 * sessions. Keep it minimal.
 */
/** A live coach↔athlete link, with when it started. */
export interface CoachedAthlete {
    athleteId: string
    /**
     * When the coaching relationship began. Carried because "hasn't trained" only
     * means something relative to it: an athlete linked this morning has trained
     * exactly as much as one who quit a month ago, and only one of them is a
     * problem.
     */
    since: Date
}

export abstract class CoachLinks {
    /** Whether the coach currently coaches the athlete. */
    abstract areLinked(coachId: string, athleteId: string): Promise<boolean>
    /**
     * Every athlete the coach currently coaches, newest link first. Lets workouts
     * roll up a whole roster in one grouped query rather than asking `areLinked`
     * per athlete and then running a per-athlete rollup — N+1 twice over.
     */
    abstract athletesOf(coachId: string): Promise<CoachedAthlete[]>
}
