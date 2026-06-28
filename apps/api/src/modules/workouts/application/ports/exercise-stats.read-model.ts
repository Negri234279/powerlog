import type { ExerciseCategory } from '../../domain/exercise-taxonomy'

/** Filter for per-exercise analytics: always user-scoped, optional date range. */
export interface ExerciseStatsFilter {
    userId: string
    from?: Date
    to?: Date
}

/** Aggregated stats for one exercise across the user's logged (actual) sets. */
export interface ExerciseStatsRow {
    exerciseId: string
    slug: string
    name: string
    category: ExerciseCategory
    /** Σ weight·reps (kg) over actual sets. */
    totalVolumeKg: number
    totalSets: number
    totalReps: number
    /** Best estimated 1RM (kg) — the e1RM PR. */
    bestE1rmKg: number | null
    /** Heaviest single actual set (kg). */
    heaviestWeightKg: number | null
}

/**
 * Read-only analytics port: per-exercise volume + PRs, aggregated directly in SQL
 * (GROUP BY) rather than rebuilding aggregates. Infra provides the Drizzle impl.
 */
export abstract class ExerciseStatsReadModel {
    abstract perExercise(filter: ExerciseStatsFilter): Promise<ExerciseStatsRow[]>
}
