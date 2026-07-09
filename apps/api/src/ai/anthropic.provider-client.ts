import Anthropic from '@anthropic-ai/sdk'

import { ProviderRefusedError } from './ai.errors'
import {
    type AiProvider,
    type LlmCompletion,
    type LlmCompletionRequest,
    type LlmModel,
    LlmProviderClient,
} from './llm-provider.port'
import { callProvider } from './provider-error'

const REQUEST_TIMEOUT_MS = 120_000
const DEFAULT_MAX_TOKENS = 4096

/**
 * Anthropic adapter. Like the OpenAI one, a client is built per call because the
 * key is the calling user's (BYOK).
 *
 * No `thinking` parameter is sent. Adaptive thinking is the right default when
 * *we* choose the model, but here the user picks any model their key can reach:
 * `{type: "adaptive"}` is rejected with a 400 on pre-4.6 models, so opting in
 * blindly would break exactly the users on older models. The analysis features
 * can enable it per model once they know which one they are calling.
 */
export class AnthropicProviderClient extends LlmProviderClient {
    readonly provider: AiProvider = 'anthropic'

    async listModels(apiKey: string): Promise<LlmModel[]> {
        const client = this.clientFor(apiKey)

        return callProvider(async () => {
            const models: LlmModel[] = []

            for await (const model of client.models.list()) {
                models.push({ id: model.id, displayName: model.display_name })
            }

            return models
        })
    }

    async complete(request: LlmCompletionRequest): Promise<LlmCompletion> {
        const client = this.clientFor(request.apiKey)

        return callProvider(async () => {
            const response = await client.messages.create({
                model: request.model,
                max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
                ...(request.system ? { system: request.system } : {}),
                messages: request.messages,
            })

            // A safety classifier can decline the request: HTTP 200, empty
            // content, `stop_reason: "refusal"`. Check before reading content.
            if (response.stop_reason === 'refusal') throw new ProviderRefusedError()

            const text = response.content
                .filter((block) => block.type === 'text')
                .map((block) => block.text)
                .join('')

            return {
                text,
                model: response.model,
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens,
                },
            }
        })
    }

    private clientFor(apiKey: string): Anthropic {
        return new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS })
    }
}
