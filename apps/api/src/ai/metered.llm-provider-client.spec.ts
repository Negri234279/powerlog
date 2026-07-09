import { describe, expect, it } from 'vitest'

import { counterValue, testCounter, testHistogram } from '../../tests/doubles/shared'
import {
    type AiProvider,
    type LlmCompletion,
    type LlmCompletionRequest,
    type LlmModel,
    LlmProviderClient,
} from './llm-provider.port'
import { MeteredLlmProviderClient } from './metered.llm-provider-client'

/** Answers with a fixed completion, or fails, to drive the decorator under test. */
class StubProviderClient extends LlmProviderClient {
    readonly provider: AiProvider = 'openai'

    constructor(private readonly failWith?: Error) {
        super()
    }

    async listModels(): Promise<LlmModel[]> {
        if (this.failWith) throw this.failWith

        return [{ id: 'gpt-5', displayName: 'gpt-5' }]
    }

    async complete(_request: LlmCompletionRequest): Promise<LlmCompletion> {
        if (this.failWith) throw this.failWith

        return { text: 'hello', model: 'gpt-5', usage: { inputTokens: 12, outputTokens: 34 } }
    }
}

const newRequests = () => testCounter(['provider', 'operation', 'status'])
const newTokens = () => testCounter(['provider', 'direction'])

const wrap = (inner: LlmProviderClient, requests = newRequests(), tokens = newTokens()) =>
    new MeteredLlmProviderClient(inner, requests, testHistogram(['provider', 'operation', 'status']), tokens)

const request: LlmCompletionRequest = {
    apiKey: 'sk-test',
    model: 'gpt-5',
    messages: [{ role: 'user', content: 'How is my squat progressing?' }],
}

describe('MeteredLlmProviderClient', () => {
    it('delegates to the inner client and returns its completion', async () => {
        const completion = await wrap(new StubProviderClient()).complete(request)

        expect(completion.text).toBe('hello')
    })

    it('counts a successful completion by provider and operation', async () => {
        const requests = newRequests()

        await wrap(new StubProviderClient(), requests).complete(request)

        expect(await counterValue(requests, { provider: 'openai', operation: 'complete', status: 'ok' })).toBe(1)
    })

    it('adds up the tokens billed to the user, split by direction', async () => {
        const tokens = newTokens()

        await wrap(new StubProviderClient(), newRequests(), tokens).complete(request)

        expect(await counterValue(tokens, { provider: 'openai', direction: 'input' })).toBe(12)
        expect(await counterValue(tokens, { provider: 'openai', direction: 'output' })).toBe(34)
    })

    it('counts a failure and rethrows so callers keep their error handling', async () => {
        const requests = newRequests()
        const client = wrap(new StubProviderClient(new Error('provider down')), requests)

        await expect(client.complete(request)).rejects.toThrow('provider down')
        expect(await counterValue(requests, { provider: 'openai', operation: 'complete', status: 'failed' })).toBe(1)
    })

    it('does not count tokens when the call fails', async () => {
        const tokens = newTokens()
        const client = wrap(new StubProviderClient(new Error('provider down')), newRequests(), tokens)

        await expect(client.complete(request)).rejects.toThrow()
        expect(await counterValue(tokens, { provider: 'openai', direction: 'input' })).toBe(0)
    })

    it('measures listModels under its own operation label', async () => {
        const requests = newRequests()

        await wrap(new StubProviderClient(), requests).listModels('sk-test')

        expect(await counterValue(requests, { provider: 'openai', operation: 'list_models', status: 'ok' })).toBe(1)
    })

    it('exposes the wrapped client provider so the registry can key on it', () => {
        expect(wrap(new StubProviderClient()).provider).toBe('openai')
    })
})
