/** Filter for the template list: always owner-scoped, optional name search. */
export interface WorkoutTemplateListFilter {
    ownerId: string
    /** Case-insensitive substring match on the template name. */
    search?: string
}

/** One row of the template list: header + cheap rollups. */
export interface WorkoutTemplateSummaryRow {
    id: string
    name: string
    notes: string | null
    updatedAt: Date
    /** Number of exercises in the template. */
    exerciseCount: number
    /** Number of programmed sets across all exercises. */
    setCount: number
}

/**
 * Read-only port for the owner's template list, aggregated directly in SQL
 * (GROUP BY template) rather than rebuilding aggregates. Ordered name-first.
 * Infra provides the Drizzle impl.
 */
export abstract class WorkoutTemplateListReadModel {
    abstract list(filter: WorkoutTemplateListFilter): Promise<WorkoutTemplateSummaryRow[]>
}
