import {
    type AiDraftHistoryFilter,
    type AiDraftHistorySlice,
    type AiDraftSummaryRow,
    AiDraftHistoryReadModel,
} from '../../../src/modules/ai/application/ports/ai-draft-history.read-model'

/**
 * In-memory implementation of the real port, keyset semantics included: the
 * handler's paging is only worth testing against a source that actually pages.
 */
export class InMemoryAiDraftHistoryReadModel extends AiDraftHistoryReadModel {
    private rows: AiDraftSummaryRow[] = []

    seed(...rows: AiDraftSummaryRow[]): void {
        this.rows.push(...rows)
    }

    async list(filter: AiDraftHistoryFilter): Promise<AiDraftHistorySlice> {
        const ordered = [...this.rows].sort(byRecencyThenId)

        const matching = ordered.filter((row) => {
            if (filter.kind && row.kind !== filter.kind) return false
            if (filter.status && row.status !== filter.status) return false
            if (filter.sessionId && row.sessionId !== filter.sessionId) return false
            if (filter.athleteId === 'self' && row.athleteId !== null) return false
            if (filter.athleteId && filter.athleteId !== 'self' && row.athleteId !== filter.athleteId) return false
            if (filter.cursor && !isAfter(row, filter.cursor)) return false

            return true
        })

        const hasNextPage = matching.length > filter.limit

        return {
            hasNextPage,
            items: matching.slice(0, filter.limit),
        }
    }
}

/** Newest activity first, id breaking ties — the ordering the cursor rides on. */
function byRecencyThenId(a: AiDraftSummaryRow, b: AiDraftSummaryRow): number {
    const byTime = b.updatedAt.getTime() - a.updatedAt.getTime()

    return byTime !== 0 ? byTime : b.id.localeCompare(a.id)
}

function isAfter(row: AiDraftSummaryRow, cursor: { updatedAt: Date; id: string }): boolean {
    const time = row.updatedAt.getTime()
    const cursorTime = cursor.updatedAt.getTime()

    return time !== cursorTime ? time < cursorTime : row.id.localeCompare(cursor.id) < 0
}
