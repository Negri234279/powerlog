import { describe, expect, it } from 'vitest'

import { computeCost, type ModelPrice } from './model-price'

const price: ModelPrice = { inputUsdPerMTok: 5, outputUsdPerMTok: 25 }

describe('computeCost', () => {
    it('prices input and output at their per-million rates', () => {
        const cost = computeCost(price, { inputTokens: 1_000_000, outputTokens: 200_000 })

        expect(cost.inputCost).toBe(5)
        expect(cost.outputCost).toBe(5)
        expect(cost.totalCost).toBe(10)
    })

    it('adds cache read at 0.1x and cache write at 1.25x of the input rate by default', () => {
        const cost = computeCost(price, {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadInputTokens: 1_000_000,
            cacheCreationInputTokens: 1_000_000,
        })

        // read: 1M × (5 × 0.1) = 0.5 ; write: 1M × (5 × 1.25) = 6.25
        expect(cost.totalCost).toBeCloseTo(6.75, 10)
        // The cache cost lives in totalCost, not in the input/output split.
        expect(cost.inputCost).toBe(0)
        expect(cost.outputCost).toBe(0)
    })

    it('uses explicit cache rates when the price table provides them', () => {
        const withRates: ModelPrice = { ...price, cacheReadUsdPerMTok: 1, cacheWriteUsdPerMTok: 2 }

        const cost = computeCost(withRates, {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadInputTokens: 1_000_000,
            cacheCreationInputTokens: 1_000_000,
        })

        expect(cost.totalCost).toBe(3)
    })

    it('treats missing cache tokens as zero', () => {
        const cost = computeCost(price, { inputTokens: 2_000_000, outputTokens: 0 })

        expect(cost.totalCost).toBe(10)
    })
})
