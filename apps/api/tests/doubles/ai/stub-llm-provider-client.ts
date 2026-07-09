import type { LlmCompletion, LlmCompletionRequest, LlmModel } from '../../../src/ai/llm-provider.port'
import { LlmProviderClient } from '../../../src/ai/llm-provider.port'
import { LlmProviderRegistry } from '../../../src/ai/llm-provider.registry'
import type { AiProvider } from '../../../src/shared/ai-provider'

/**
 * Stands in for a real provider. Records the API keys it was called with, so a
 * test can assert the decrypted key reached the provider — and only there.
 */
export class StubLlmProviderClient extends LlmProviderClient {
    readonly listModelsCalledWith: string[] = []

    constructor(
        readonly provider: AiProvider,
        private readonly models: LlmModel[] = [{ id: 'gpt-5', displayName: 'gpt-5' }],
        private readonly failWith?: Error,
    ) {
        super()
    }

    async listModels(apiKey: string): Promise<LlmModel[]> {
        this.listModelsCalledWith.push(apiKey)
        if (this.failWith) throw this.failWith

        return this.models
    }

    async complete(_request: LlmCompletionRequest): Promise<LlmCompletion> {
        if (this.failWith) throw this.failWith

        return { text: '', model: '', usage: { inputTokens: 0, outputTokens: 0 } }
    }
}

/** The real registry, wired with stub clients — no need to fake the registry. */
export function stubRegistry(...clients: StubLlmProviderClient[]): LlmProviderRegistry {
    return new LlmProviderRegistry(clients)
}
