/**
 * The LLM providers powerlog can talk to.
 *
 * Lives in the shared kernel because it is vocabulary both sides need: the `ai`
 * module's **domain** keys its aggregate by it, and the `src/ai` provider layer
 * resolves adapters by it. Keeping it here means the domain never has to import
 * the provider layer (infrastructure) just to name a provider.
 *
 * Also used as a bounded Prometheus label — keep the list small.
 */
export const AI_PROVIDERS = ['openai', 'anthropic'] as const

export type AiProvider = (typeof AI_PROVIDERS)[number]

export function isAiProvider(value: string): value is AiProvider {
    return (AI_PROVIDERS as readonly string[]).includes(value)
}
