/** One (provider, model) line of the caller's spend, with the current unit rate. */
export interface AiUsageRowView {
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    /** Current USD/1M rate for display; null when the model has no known price. */
    inputPricePerMTok: number | null
    outputPricePerMTok: number | null
    /** Sum of the per-call cost snapshots; null when every call was unpriced. */
    totalCost: number | null
    requests: number
    lastUsedAt: Date
}

export interface AiUsageTotalsView {
    inputTokens: number
    outputTokens: number
    totalCost: number | null
    requests: number
}

/** The whole spend table: per-model rows, grand totals, and the cost currency. */
export interface AiUsageSummaryView {
    rows: AiUsageRowView[]
    totals: AiUsageTotalsView
    currency: string
}
