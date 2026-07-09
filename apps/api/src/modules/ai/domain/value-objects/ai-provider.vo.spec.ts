import { describe, expect, it } from 'vitest'

import { InvalidAiProviderError } from '../errors/ai-settings.errors'
import { AiProviderVO } from './ai-provider.vo'

describe('AiProviderVO', () => {
    it('accepts the supported providers', () => {
        expect(AiProviderVO.create('openai').value).toBe('openai')
        expect(AiProviderVO.create('anthropic').value).toBe('anthropic')
    })

    it('rejects an unsupported provider', () => {
        expect(() => AiProviderVO.create('gemini')).toThrow(InvalidAiProviderError)
    })

    it('compares by value', () => {
        expect(AiProviderVO.create('openai').equals(AiProviderVO.create('openai'))).toBe(true)
        expect(AiProviderVO.create('openai').equals(AiProviderVO.create('anthropic'))).toBe(false)
    })
})
