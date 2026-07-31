/** A model's price, in US dollars per 1,000,000 tokens. */
export interface ModelPrice {
    inputUsdPerMTok: number
    outputUsdPerMTok: number
    /**
     * Cache read/write rates, when a provider publishes distinct ones. Left
     * unset, they derive from `inputUsdPerMTok`: read = 0.1×, write = 1.25× (the
     * Anthropic 5-minute-TTL convention). Providers that don't bill cache writes
     * (OpenAI) never send creation tokens, so the write rate is moot there.
     */
    cacheReadUsdPerMTok?: number
    cacheWriteUsdPerMTok?: number
}

/** Tokens a completion consumed, in the canonical disjoint shape (see `LlmUsage`). */
export interface UsageTokens {
    inputTokens: number
    outputTokens: number
    cacheReadInputTokens?: number
    cacheCreationInputTokens?: number
}

/**
 * The cost of one completion, split by direction, in the price's currency.
 * `inputCost` is full-price input only; the cache read/write cost is folded into
 * `totalCost` (and recoverable as `totalCost − inputCost − outputCost`).
 */
export interface UsageCost {
    inputCost: number
    outputCost: number
    totalCost: number
}

const TOKENS_PER_MILLION = 1_000_000

/** read defaults to 0.1× the input rate; write to 1.25× (Anthropic 5-min TTL). */
const CACHE_READ_MULTIPLIER = 0.1
const CACHE_WRITE_MULTIPLIER = 1.25

/** Cost of a completion at the given rate. Pure — no rounding, callers format. */
export function computeCost(price: ModelPrice, usage: UsageTokens): UsageCost {
    const cacheReadRate = price.cacheReadUsdPerMTok ?? price.inputUsdPerMTok * CACHE_READ_MULTIPLIER
    const cacheWriteRate = price.cacheWriteUsdPerMTok ?? price.inputUsdPerMTok * CACHE_WRITE_MULTIPLIER

    const inputCost = (usage.inputTokens / TOKENS_PER_MILLION) * price.inputUsdPerMTok
    const outputCost = (usage.outputTokens / TOKENS_PER_MILLION) * price.outputUsdPerMTok
    const cacheReadCost = ((usage.cacheReadInputTokens ?? 0) / TOKENS_PER_MILLION) * cacheReadRate
    const cacheWriteCost = ((usage.cacheCreationInputTokens ?? 0) / TOKENS_PER_MILLION) * cacheWriteRate

    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost + cacheReadCost + cacheWriteCost,
    }
}
