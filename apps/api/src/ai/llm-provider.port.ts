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

export interface LlmCompletionRequest {
    /** The user's own key. Never persisted here, never logged. */
    apiKey: string
    model: string
    /** Instructions that frame the conversation, outside the message history. */
    system?: string
    messages: LlmMessage[]
    /** Hard ceiling on the answer. Anthropic requires one, so a default applies. */
    maxTokens?: number
}

export interface LlmUsage {
    inputTokens: number
    outputTokens: number
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
