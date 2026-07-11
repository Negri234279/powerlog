/** A model's price, in US dollars per 1,000,000 tokens. */
export interface ModelPrice {
    inputUsdPerMTok: number
    outputUsdPerMTok: number
}

/** The cost of one completion, split by direction, in the price's currency. */
export interface UsageCost {
    inputCost: number
    outputCost: number
    totalCost: number
}

const TOKENS_PER_MILLION = 1_000_000

/** Cost of a completion at the given rate. Pure — no rounding, callers format. */
export function computeCost(price: ModelPrice, inputTokens: number, outputTokens: number): UsageCost {
    const inputCost = (inputTokens / TOKENS_PER_MILLION) * price.inputUsdPerMTok
    const outputCost = (outputTokens / TOKENS_PER_MILLION) * price.outputUsdPerMTok

    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
    }
}
