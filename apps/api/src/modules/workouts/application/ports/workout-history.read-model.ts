import type { WorkoutStatus } from '../../domain/workout-status'

/** Keyset cursor: the (performedAt, id) of the last row of the previous page. */
export interface WorkoutHistoryCursor {
    performedAt: Date
    id: string
}

/** Filter for the session history list: always user-scoped, keyset-paginated. */
export interface WorkoutHistoryFilter {
    userId: string
    /** Page size (the impl fetches one extra row to compute `hasNextPage`). */
    limit: number
    status?: WorkoutStatus
    from?: Date
    to?: Date
    /** Only sessions containing an entry for this exercise. */
    exerciseId?: string
    /** Case-insensitive substring match on the session notes. */
    query?: string
    cursor?: WorkoutHistoryCursor
}

/** One row of the history list: session header + cheap rollups. Weights are kg. */
export interface WorkoutSessionSummaryRow {
    id: string
    userId: string
    status: WorkoutStatus
    performedAt: Date
    notes: string | null
    plannedByUserId: string | null
    createdAt: Date
    updatedAt: Date
    /** Number of exercise entries in the session. */
    exerciseCount: number
    /** Number of sets across all entries (planned or logged). */
    setCount: number
    /** Σ weight·reps (kg) over logged (actual) sets. */
    totalVolumeKg: number
}

/** A keyset page: trimmed rows plus whether another page follows. */
export interface WorkoutHistorySlice {
    items: WorkoutSessionSummaryRow[]
    hasNextPage: boolean
}

/**
 * Read-only port for the paginated session history, aggregated directly in SQL
 * (GROUP BY session) rather than rebuilding aggregates. Infra provides the
 * Drizzle impl; cursor encoding/decoding lives in the application layer.
 */
export abstract class WorkoutHistoryReadModel {
    abstract list(filter: WorkoutHistoryFilter): Promise<WorkoutHistorySlice>
}
