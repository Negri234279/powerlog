import { PinoLogger } from 'nestjs-pino'
import type { Counter, Histogram } from 'prom-client'

import {
    type AiProvider,
    type LlmCompletion,
    type LlmCompletionRequest,
    type LlmModel,
    LlmProviderClient,
} from './llm-provider.port'

type Operation = 'list_models' | 'complete'

/**
 * Decorates a provider adapter with the call-side observability: counts calls by
 * provider/operation/outcome, times them into a latency histogram, and adds up
 * the tokens the user's account was billed for. Wrapping the adapter covers
 * every LLM call from one place, exactly as `MeteredMailer` does for email.
 *
 * Failures are counted, logged and re-thrown so callers keep their error
 * handling. The failure *reason* is not a label here — the `GlobalExceptionFilter`
 * already breaks domain errors down by `code` in `domain_errors_total`.
 *
 * Nothing user-identifying is logged: no API key, no prompt, no completion text.
 */
export class MeteredLlmProviderClient extends LlmProviderClient {
    readonly provider: AiProvider

    constructor(
        private readonly inner: LlmProviderClient,
        private readonly requests: Counter<string>,
        private readonly requestDuration: Histogram<string>,
        private readonly tokens: Counter<string>,
        private readonly logger?: PinoLogger,
    ) {
        super()
        this.provider = inner.provider
        this.logger?.setContext(MeteredLlmProviderClient.name)
    }

    async listModels(apiKey: string): Promise<LlmModel[]> {
        return this.measure('list_models', () => this.inner.listModels(apiKey))
    }

    async complete(request: LlmCompletionRequest): Promise<LlmCompletion> {
        const completion = await this.measure('complete', () => this.inner.complete(request))

        this.tokens.inc({ provider: this.provider, direction: 'input' }, completion.usage.inputTokens)
        this.tokens.inc({ provider: this.provider, direction: 'output' }, completion.usage.outputTokens)

        this.logger?.info(
            {
                provider: this.provider,
                model: completion.model,
                inputTokens: completion.usage.inputTokens,
                outputTokens: completion.usage.outputTokens,
            },
            'llm completion',
        )

        return completion
    }

    private async measure<T>(operation: Operation, call: () => Promise<T>): Promise<T> {
        const provider = this.provider
        const startedAt = Date.now()
        const end = this.requestDuration.startTimer({ provider, operation })

        try {
            const result = await call()

            this.requests.inc({ provider, operation, status: 'ok' })
            end({ status: 'ok' })

            return result
        } catch (error) {
            this.requests.inc({ provider, operation, status: 'failed' })
            end({ status: 'failed' })
            this.logger?.error({ provider, operation, ms: Date.now() - startedAt, err: error }, 'llm call failed')

            throw error
        }
    }
}
