import type { LlmCompletion, LlmCompletionRequest, LlmModel } from '../../../src/ai/llm-provider.port'
import { LlmProviderClient } from '../../../src/ai/llm-provider.port'
import { LlmProviderRegistry } from '../../../src/ai/llm-provider.registry'
import type { AiProvider } from '../../../src/shared/ai-provider'

/**
 * Stands in for a real provider. Records the API keys it was called with, so a
 * test can assert the decrypted key reached the provider — and only there — and
 * replays a scripted sequence of completions, so a test can drive the retry path.
 */
export class StubLlmProviderClient extends LlmProviderClient {
    readonly listModelsCalledWith: string[] = []
    readonly completeCalls: LlmCompletionRequest[] = []
    /** Answers handed out in order; the last one repeats once exhausted. */
    private completions: string[] = ['']

    constructor(
        readonly provider: AiProvider,
        private readonly models: LlmModel[] = [{ id: 'gpt-5', displayName: 'gpt-5' }],
        private readonly failWith?: Error,
    ) {
        super()
    }

    /** Script what the model answers, one entry per call. */
    willAnswer(...completions: string[]): this {
        this.completions = completions

        return this
    }

    /**
     * Forget the calls recorded so far. An e2e overrides the provider registry
     * once for the whole suite, so one instance serves every test — without this,
     * "the provider was never called" is asserted against the previous test's calls.
     */
    reset(): this {
        this.completeCalls.length = 0
        this.listModelsCalledWith.length = 0

        return this
    }

    async listModels(apiKey: string): Promise<LlmModel[]> {
        this.listModelsCalledWith.push(apiKey)
        if (this.failWith) throw this.failWith

        return this.models
    }

    async complete(request: LlmCompletionRequest): Promise<LlmCompletion> {
        this.completeCalls.push(request)
        if (this.failWith) throw this.failWith

        const text = this.completions[Math.min(this.completeCalls.length - 1, this.completions.length - 1)] ?? ''

        return { text, model: request.model, usage: { inputTokens: 1, outputTokens: 1 } }
    }
}

/** The real registry, wired with stub clients — no need to fake the registry. */
export function stubRegistry(...clients: StubLlmProviderClient[]): LlmProviderRegistry {
    return new LlmProviderRegistry(clients)
}
