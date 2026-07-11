import {
    type AiUsageEntry,
    AiUsageRepository,
    type AiUsageSummaryRow,
} from '../../../src/modules/ai/domain/repositories/ai-usage.repository'

/** SQL `sum` skips nulls; a group is null only when every row is. Mirror that. */
function sumNullable(a: number | null, b: number | null): number | null {
    if (a === null && b === null) return null

    return (a ?? 0) + (b ?? 0)
}

/** In-memory implementation of the real port: an append-only list of entries. */
export class InMemoryAiUsageRepository extends AiUsageRepository {
    private rows: AiUsageEntry[] = []

    /** Pre-populate the meter for a test's arrange step. */
    seed(...entries: AiUsageEntry[]): void {
        this.rows.push(...entries)
    }

    all(): AiUsageEntry[] {
        return [...this.rows]
    }

    async record(entry: AiUsageEntry): Promise<void> {
        this.rows.push(entry)
    }

    async summaryByUser(userId: string): Promise<AiUsageSummaryRow[]> {
        const groups = new Map<string, AiUsageSummaryRow>()

        for (const row of this.rows.filter((entry) => entry.userId === userId)) {
            const key = `${row.provider}:${row.model}`
            const current = groups.get(key)

            if (!current) {
                groups.set(key, {
                    provider: row.provider,
                    model: row.model,
                    inputTokens: row.inputTokens,
                    outputTokens: row.outputTokens,
                    totalCost: row.totalCost,
                    requests: 1,
                    lastUsedAt: row.createdAt,
                })
                continue
            }

            current.inputTokens += row.inputTokens
            current.outputTokens += row.outputTokens
            current.totalCost = sumNullable(current.totalCost, row.totalCost)
            current.requests += 1
            if (row.createdAt > current.lastUsedAt) current.lastUsedAt = row.createdAt
        }

        return [...groups.values()].sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0))
    }

    async deleteAllByUser(userId: string): Promise<void> {
        this.rows = this.rows.filter((entry) => entry.userId !== userId)
    }
}
