/** Roster rollups are asked for a whole squad at once, scoped to one coach. */
export interface CoachRosterFilter {
    /** The athletes to roll up. An empty list must not hit the database at all. */
    athleteIds: string[]
    /** Whose programming adherence is measured against. */
    coachId: string
    /** Window for the ranged figures; unbounded when absent. */
    from?: Date
    to?: Date
    /** Splits overdue from upcoming; injected so tests stay deterministic. */
    now: Date
}

/**
 * One athlete's line in the coach's roster.
 *
 * Two of these fields deliberately **ignore the range**: `lastSessionAt` looks
 * all the way back and `nextSessionAt` all the way forward. A future session
 * cannot fall inside a past window, and "last trained 40 days ago" is precisely
 * what a 30-day window would hide — which is the one thing this screen exists to
 * surface. Everything else is windowed.
 */
export interface CoachRosterRow {
    athleteId: string
    /** All-time; null when they have never completed a session. */
    lastSessionAt: Date | null
    /** All-future; null when nothing is on the calendar. */
    nextSessionAt: Date | null
    /** Adherence to this coach's programming, in range. */
    plannedCompleted: number
    plannedMissed: number
    /** Completed sessions in range, whoever programmed them. */
    completedSessions: number
    /** Σ weight·reps in range, and over the preceding window for the trend. */
    volumeKg: number
    previousVolumeKg: number
}

/**
 * The coach's roster, rolled up in one grouped pass. Separate from
 * `TrainingDashboardReadModel` because every method there answers about **one**
 * user: this one is deliberately plural, and the difference is what keeps a
 * 40-athlete roster from becoming 40 round trips.
 */
export abstract class CoachRosterReadModel {
    abstract roster(filter: CoachRosterFilter): Promise<CoachRosterRow[]>
}
