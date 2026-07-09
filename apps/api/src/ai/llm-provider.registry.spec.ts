import { describe, expect, it } from 'vitest'

import { type AiProvider, isAiProvider } from '../shared/ai-provider'
import { UnsupportedProviderError } from './ai.errors'
import { type LlmCompletion, type LlmCompletionRequest, type LlmModel, LlmProviderClient } from './llm-provider.port'
import { LlmProviderRegistry } from './llm-provider.registry'

class StubProviderClient extends LlmProviderClient {
    constructor(readonly provider: AiProvider) {
        super()
    }

    async listModels(): Promise<LlmModel[]> {
        return []
    }

    async complete(_request: LlmCompletionRequest): Promise<LlmCompletion> {
        return { text: '', model: '', usage: { inputTokens: 0, outputTokens: 0 } }
    }
}

describe('LlmProviderRegistry', () => {
    it('resolves each registered provider to its own client', () => {
        const openai = new StubProviderClient('openai')
        const anthropic = new StubProviderClient('anthropic')

        const registry = new LlmProviderRegistry([openai, anthropic])

        expect(registry.for('openai')).toBe(openai)
        expect(registry.for('anthropic')).toBe(anthropic)
    })

    it('rejects a provider with no registered adapter', () => {
        const registry = new LlmProviderRegistry([new StubProviderClient('openai')])

        expect(() => registry.for('anthropic')).toThrow(UnsupportedProviderError)
    })
})

describe('isAiProvider', () => {
    it('accepts the supported providers and rejects anything else', () => {
        expect(isAiProvider('openai')).toBe(true)
        expect(isAiProvider('anthropic')).toBe(true)
        expect(isAiProvider('gemini')).toBe(false)
    })
})
