import type { ExerciseCategory, ExerciseMuscle } from '../../domain/exercise-taxonomy'

/** Base analytics filter: always user-scoped, optional date range. */
export interface TrainingAnalyticsFilter {
    userId: string
    from?: Date
    to?: Date
}

/** Strength progression is always for a single exercise. */
export interface StrengthProgressionFilter extends TrainingAnalyticsFilter {
    exerciseId: string
}

/**
 * Execution/adherence is asked by a coach about one athlete, so it needs two
 * extra things the other aggregations don't: whose programming to hold the
 * athlete to, and where "now" is (a planned session in the past is missed; the
 * same session in the future is merely upcoming).
 */
export interface ExecutionFilter extends TrainingAnalyticsFilter {
    /** Only sessions programmed by this coach count towards adherence. */
    plannedByUserId: string
    /**
     * Start of the immediately preceding window of equal length, for the
     * period-over-period trend. Undefined when the range is unbounded — "all
     * time" has nothing before it to compare against.
     */
    previousFrom?: Date
    /** Injected rather than `now()` in SQL, so the split is deterministic in tests. */
    now: Date
}

/**
 * Raw execution counters. Every ratio the coach actually reads (adherence,
 * success rate, load compliance, trends) is derived in the handler, not here —
 * SQL counts, the application decides what a count with a zero denominator
 * means.
 */
export interface ExecutionRow {
    /** Completed sessions this coach programmed, in range. */
    plannedCompleted: number
    /** Still `planned` and already past — the athlete didn't do them. In range. */
    plannedMissed: number
    /**
     * Still `planned` and in the future. Deliberately NOT range-bounded: it
     * answers "what's still on the calendar", which a range ending today would
     * always report as zero.
     */
    plannedUpcoming: number
    /** Completed sessions in range, whoever programmed them. */
    completedSessions: number
    /** Same, over the preceding window; 0 when there is none. */
    previousCompletedSessions: number
    /** Sets the athlete marked, in range, across all their training. */
    successSets: number
    failedSets: number
    /** Logged inside a completed session but never marked either way. */
    pendingSets: number
    /**
     * Σ planned weight·reps over sets that carried a plan inside a completed
     * session, and the actual Σ over those same sets (a planned set left
     * unperformed contributes 0, which is the point). Sessions that were never
     * completed are excluded — adherence already accounts for those, and
     * counting them here would punish the same miss twice.
     */
    plannedLoadKg: number
    actualLoadKg: number
    /** How many sets those two sums are built from — the compliance denominator. */
    plannedSets: number
    /** Σ weight·reps in range, and over the preceding window. */
    volumeKg: number
    previousVolumeKg: number
    /** All-time bounds of completed training — deliberately ignore the range. */
    firstSessionAt: Date | null
    lastSessionAt: Date | null
}

/** Headline KPIs for the dashboard, all within the filtered range. */
export interface TrainingSummaryRow {
    /** Completed sessions in range. */
    sessions: number
    /** Distinct calendar days with a completed session. */
    trainingDays: number
    /** Logged (actual) sets. */
    totalSets: number
    /** Σ reps over actual sets. */
    totalReps: number
    /** Σ weight·reps (kg) over actual sets. */
    totalVolumeKg: number
    /** Mean RPE over sets that recorded one; null when none did. */
    avgRpe: number | null
    /** Distinct exercises trained. */
    distinctExercises: number
    /** Best estimated 1RM (kg) for each competition lift; null when untrained. */
    bestSquatE1rmKg: number | null
    bestBenchE1rmKg: number | null
    bestDeadliftE1rmKg: number | null
}

/** One time bucket (week) of training volume. */
export interface VolumeBucketRow {
    /** Start of the bucket (week), UTC. */
    bucketStart: Date
    totalVolumeKg: number
    totalSets: number
    sessions: number
}

/** Best actual e1RM on a given session date, for one exercise. */
export interface StrengthPointRow {
    performedAt: Date
    e1rmKg: number
}

/** Volume + sets aggregated over a grouping key (muscle or category). */
export interface DistributionRow<K extends string = string> {
    key: K
    totalVolumeKg: number
    totalSets: number
}

/** Count of actual sets at an intensity value (rounded RPE, or integer RIR). */
export interface IntensityBucketRow {
    /** RPE rounded to the nearest integer (6–10 typically), or RIR (0–50). */
    value: number
    sets: number
}

/**
 * Muscle + movement distribution and the intensity breakdown. RPE and RIR are
 * separate series because a set records at most one of them (assertSingleIntensity).
 */
export interface TrainingDistribution {
    byMuscle: DistributionRow<ExerciseMuscle>[]
    byCategory: DistributionRow<ExerciseCategory>[]
    rpe: IntensityBucketRow[]
    rir: IntensityBucketRow[]
}

/**
 * Read-only analytics for the training dashboard. One cohesive port (rather than
 * many granular ones) since every method shares the same user-scoped, ranged
 * filter and all feed the same screen. Each aggregation runs directly in SQL;
 * the trend/projection maths lives in the domain (`strength-projection.ts`).
 */
export abstract class TrainingDashboardReadModel {
    abstract summary(filter: TrainingAnalyticsFilter): Promise<TrainingSummaryRow>
    abstract volumeSeries(filter: TrainingAnalyticsFilter): Promise<VolumeBucketRow[]>
    abstract strengthSeries(filter: StrengthProgressionFilter): Promise<StrengthPointRow[]>
    abstract distribution(filter: TrainingAnalyticsFilter): Promise<TrainingDistribution>
    abstract execution(filter: ExecutionFilter): Promise<ExecutionRow>
}
