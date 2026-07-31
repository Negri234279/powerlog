import type { AiProvider } from '../../../../shared/ai-provider'

/**
 * A completion the user's key was billed for. Emitted from `AiConversation` and
 * consumed asynchronously by `RecordAiUsageHandler`, so persisting the meter
 * never sits on the request path. Carries raw tokens only — pricing is applied
 * by the handler so the rate lives in one place.
 */
export class AiUsageRecordedEvent {
    constructor(
        readonly userId: string,
        readonly provider: AiProvider,
        /** The model that actually answered (provider-reported). */
        readonly model: string,
        readonly inputTokens: number,
        readonly outputTokens: number,
        /** Canonical disjoint cache figures (see `LlmUsage`); 0 when caching didn't apply. */
        readonly cacheReadInputTokens: number,
        readonly cacheCreationInputTokens: number,
        readonly occurredAt: Date,
    ) {}
}
