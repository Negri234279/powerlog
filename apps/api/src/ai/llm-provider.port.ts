import type { AiProvider } from '../shared/ai-provider'

export type { AiProvider }

/** A model the user's key is allowed to call, as reported by the provider. */
export interface LlmModel {
    id: string
    displayName: string
}

export interface LlmMessage {
    role: 'user' | 'assistant'
    content: string
}

/**
 * One span of the system instructions. Splitting `system` into ordered blocks
 * lets a caller mark where the stable prefix ends: `cache` on a block asks the
 * provider to cache everything up to and including it. Anthropic honours it
 * (`cache_control: ephemeral`); OpenAI caches by prefix automatically and ignores
 * the flag — which is why the stable part must come first either way.
 */
export interface LlmSystemBlock {
    text: string
    cache?: boolean
}

export interface LlmCompletionRequest {
    /** The user's own key. Never persisted here, never logged. */
    apiKey: string
    model: string
    /**
     * Instructions that frame the conversation, outside the message history.
     * A plain string, or ordered blocks when the caller wants a cache cut point.
     */
    system?: string | LlmSystemBlock[]
    messages: LlmMessage[]
    /** Hard ceiling on the answer. Anthropic requires one, so a default applies. */
    maxTokens?: number
}

/**
 * Tokens a completion billed, in a **canonical, disjoint** shape: `inputTokens`
 * counts only full-price input, and the two cache figures are separate on top of
 * it — total input = `inputTokens + cacheReadInputTokens + cacheCreationInputTokens`.
 *
 * Adapters normalise to this: Anthropic already reports it this way (its
 * `input_tokens` excludes cached tokens), but OpenAI folds cached tokens *into*
 * `prompt_tokens`, so its adapter subtracts them out. Keeping the shape uniform is
 * what lets pricing add the three at their own rates without knowing the provider.
 */
export interface LlmUsage {
    inputTokens: number
    outputTokens: number
    /** Cached input read back at a discount. 0 when caching didn't hit (or apply). */
    cacheReadInputTokens?: number
    /** Input written to the cache at a premium. 0 for providers that don't charge it. */
    cacheCreationInputTokens?: number
}

export interface LlmCompletion {
    text: string
    usage: LlmUsage
    /** The model that actually answered, as reported by the provider. */
    model: string
}

/**
 * A chat-completion provider. Lives outside `src/modules` (shared kernel) so any
 * module can call an LLM without crossing a boundary, mirroring `Mailer`.
 *
 * **Key-agnostic by design**: the API key travels as an argument on every call
 * rather than living on the instance, because powerlog is BYOK — each request
 * runs against the calling user's own key. A single instance per provider serves
 * every user; nothing about a user is retained between calls.
 *
 * Streaming and Anthropic's adaptive thinking are deliberately absent: no caller
 * needs them until the analysis features land, and the streaming transport is an
 * open decision. Add them here when the first consumer exists.
 */
export abstract class LlmProviderClient {
    abstract readonly provider: AiProvider

    /**
     * Lists the models the key may call. Doubles as key verification: a rejected
     * key raises `InvalidApiKeyError`, which is how the settings module checks a
     * key before persisting it.
     */
    abstract listModels(apiKey: string): Promise<LlmModel[]>

    abstract complete(request: LlmCompletionRequest): Promise<LlmCompletion>
}
