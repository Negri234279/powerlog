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
}
