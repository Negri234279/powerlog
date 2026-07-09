import OpenAI from 'openai'

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
 * `models.list` returns every model on the account — embeddings, speech,
 * moderation and images included — and the API offers no capability filter. A
 * prefix blocklist is a heuristic, but it keeps the model picker to things that
 * can actually answer a chat completion, and a false negative here only hides a
 * model from a dropdown.
 */
const NON_CHAT_MODEL_PREFIXES = [
    'babbage',
    'dall-e',
    'davinci',
    'gpt-image',
    'omni-moderation',
    'text-embedding',
    'text-moderation',
    'tts',
    'whisper',
]

function isChatModel(id: string): boolean {
    return !NON_CHAT_MODEL_PREFIXES.some((prefix) => id.startsWith(prefix))
}

/**
 * OpenAI adapter. A client is built per call because the API key belongs to the
 * calling user (BYOK) — construction is just object setup, no connection is
 * opened, so this costs nothing measurable next to the request itself.
 */
export class OpenAiProviderClient extends LlmProviderClient {
    readonly provider: AiProvider = 'openai'

    async listModels(apiKey: string): Promise<LlmModel[]> {
        const client = this.clientFor(apiKey)

        return callProvider(this.provider, async () => {
            const models: LlmModel[] = []

            // The page object auto-paginates while iterated.
            for await (const model of client.models.list()) {
                if (isChatModel(model.id)) models.push({ id: model.id, displayName: model.id })
            }

            return models.sort((a, b) => a.id.localeCompare(b.id))
        })
    }

    async complete(request: LlmCompletionRequest): Promise<LlmCompletion> {
        const client = this.clientFor(request.apiKey)

        return callProvider(this.provider, async () => {
            const response = await client.chat.completions.create({
                model: request.model,
                max_completion_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
                messages: [
                    ...(request.system ? [{ role: 'system' as const, content: request.system }] : []),
                    ...request.messages,
                ],
            })

            return {
                text: response.choices[0]?.message.content ?? '',
                model: response.model,
                usage: {
                    inputTokens: response.usage?.prompt_tokens ?? 0,
                    outputTokens: response.usage?.completion_tokens ?? 0,
                },
            }
        })
    }

    private clientFor(apiKey: string): OpenAI {
        return new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS })
    }
}
