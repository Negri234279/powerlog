import type { AiProvider } from '../../../../shared/ai-provider'

/** One metered completion, priced. Nulls where the model's price is unknown. */
export interface AiUsageEntry {
    userId: string
    provider: AiProvider
    model: string
    inputTokens: number
    outputTokens: number
    inputPricePerMTok: number | null
    outputPricePerMTok: number | null
    inputCost: number | null
    outputCost: number | null
    totalCost: number | null
    currency: string
    createdAt: Date
}

/** A per-(provider, model) rollup of a user's usage. `totalCost` null → unpriced. */
export interface AiUsageSummaryRow {
    provider: AiProvider
    model: string
    inputTokens: number
    outputTokens: number
    totalCost: number | null
    requests: number
    lastUsedAt: Date
}

/** Append-only usage meter. `record` runs off the request path; the rest read. */
export abstract class AiUsageRepository {
    abstract record(entry: AiUsageEntry): Promise<void>
    abstract summaryByUser(userId: string): Promise<AiUsageSummaryRow[]>
    abstract deleteAllByUser(userId: string): Promise<void>
}
