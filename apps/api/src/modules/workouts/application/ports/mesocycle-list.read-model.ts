import type { MesocycleStatus } from '../../domain/mesocycle-status'

/** Filter for the mesocycle list: always owner-scoped, optional name search. */
export interface MesocycleListFilter {
    ownerId: string
    /** Case-insensitive substring match on the mesocycle name. */
    search?: string
}

/** One row of the mesocycle list: header + cheap rollups. */
export interface MesocycleSummaryRow {
    id: string
    /** Coach who plans this block for the owner (null = self-made). */
    plannedByUserId: string | null
    name: string
    notes: string | null
    goal: string | null
    status: MesocycleStatus
    startDate: Date | null
    updatedAt: Date
    /** Number of microcycles (weeks). */
    weekCount: number
    /** Number of training days across all weeks. */
    dayCount: number
}

/**
 * Read-only port for the owner's mesocycle list, aggregated directly in SQL
 * (GROUP BY mesocycle) rather than rebuilding aggregates. Ordered newest-first.
 * Infra provides the Drizzle impl.
 */
export abstract class MesocycleListReadModel {
    abstract list(filter: MesocycleListFilter): Promise<MesocycleSummaryRow[]>
}
