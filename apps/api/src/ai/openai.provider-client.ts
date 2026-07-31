import OpenAI from 'openai'

import {
    type AiProvider,
    type LlmCompletion,
    type LlmCompletionRequest,
    type LlmModel,
    LlmProviderClient,
    type LlmSystemBlock,
} from './llm-provider.port'
import { callProvider } from './provider-error'

/**
 * OpenAI takes a single system message, not cache-annotated blocks: caching is
 * automatic on the prompt prefix. Join the blocks in order — the stable ones lead,
 * so the shared prefix is as long as possible — and drop the `cache` flags.
 */
function toOpenAiSystemText(system: string | LlmSystemBlock[] | undefined): string | undefined {
    if (system === undefined || typeof system === 'string') return system

    return system.map((block) => block.text).join('\n\n')
}

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
            const systemText = toOpenAiSystemText(request.system)
            const response = await client.chat.completions.create({
                model: request.model,
                max_completion_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
                messages: [
                    ...(systemText ? [{ role: 'system' as const, content: systemText }] : []),
                    ...request.messages,
                ],
            })

            // OpenAI folds cached tokens INTO `prompt_tokens` (unlike Anthropic),
            // so subtract them back out to reach the canonical disjoint shape.
            // Prompt caching is automatic on long prompts; OpenAI does not bill a
            // separate cache-write, so creation is always 0.
            const promptTokens = response.usage?.prompt_tokens ?? 0
            const cachedTokens = response.usage?.prompt_tokens_details?.cached_tokens ?? 0

            return {
                text: response.choices[0]?.message.content ?? '',
                model: response.model,
                usage: {
                    inputTokens: Math.max(0, promptTokens - cachedTokens),
                    outputTokens: response.usage?.completion_tokens ?? 0,
                    cacheReadInputTokens: cachedTokens,
                    cacheCreationInputTokens: 0,
                },
            }
        })
    }

    private clientFor(apiKey: string): OpenAI {
        return new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS })
    }
}
