import { Injectable } from '@nestjs/common'
import { EventBus } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import type { LlmMessage, LlmSystemBlock } from '../../../../ai/llm-provider.port'
import { LlmProviderRegistry } from '../../../../ai/llm-provider.registry'
import type { AiProviderConfigAggregate } from '../../domain/entities/ai-provider-config.entity'
import { AiUsageRecordedEvent } from '../events/ai-usage-recorded.event'
import { SecretCipher } from '../ports/secret-cipher.port'
import { ModelAnswerRejection } from './model-answer'

/**
 * The ceiling covers reasoning as well as the answer: Sonnet 5 runs adaptive
 * thinking when the `thinking` param is omitted (as our Anthropic adapter does),
 * and OpenAI's reasoning models spend from the same budget. 4096 was enough for
 * the JSON alone but let the thinking starve it — the answer came back truncated
 * and failed validation. Only what the model actually generates is billed.
 */
const MAX_TOKENS = 16000

/** Nudge sent back when the model's previous answer failed validation. */
function buildRetryPrompt(reason: string): string {
    return `Your previous answer was rejected: ${reason}\n\nAnswer again with the JSON object only.`
}

export interface AiConversationRequest {
    system: string | LlmSystemBlock[]
    messages: LlmMessage[]
    maxTokens?: number
    /**
     * Force a specific model instead of the config's default. A refinement passes
     * the model that produced the draft, so the whole thread runs on one model —
     * the prompt cache is per-model, and re-resolving the user's (possibly changed)
     * default would throw the cached prefix away.
     */
    model?: string
}

/**
 * One turn of business with the user's own model: decrypt their key, send the
 * conversation, and parse what comes back into something this codebase trusts.
 *
 * A malformed answer is retried **once**, telling the model exactly what was
 * wrong. Models fumble the JSON often enough that failing outright would be
 * needlessly brittle; retrying forever would just burn the user's quota. `parse`
 * signals a fixable answer by throwing `ModelAnswerRejection`; anything else it
 * throws means the answer was never going to be usable, so the retry is skipped.
 *
 * Nothing the model says reaches the caller except through `parse` — which is
 * what keeps a prompt-injected answer from surfacing as free text.
 */
@Injectable()
export class AiConversation {
    constructor(
        private readonly cipher: SecretCipher,
        private readonly providers: LlmProviderRegistry,
        private readonly logger: PinoLogger,
        private readonly eventBus: EventBus,
    ) {
        this.logger.setContext(AiConversation.name)
    }

    /**
     * `onExhausted` builds the domain error raised once the retry is spent, so
     * each feature reports its own stable `code` to the client.
     */
    async ask<T>(
        config: AiProviderConfigAggregate,
        request: AiConversationRequest,
        parse: (text: string) => T,
        onExhausted: () => Error,
    ): Promise<T> {
        const apiKey = this.cipher.decrypt(config.encryptedKey)
        const client = this.providers.for(config.provider.value)
        const model = request.model ?? (config.model as string)
        const messages = [...request.messages]

        for (let attempt = 1; attempt <= 2; attempt++) {
            const completion = await client.complete({
                apiKey: apiKey.value,
                model,
                system: request.system,
                messages,
                maxTokens: request.maxTokens ?? MAX_TOKENS,
            })

            // Fire-and-forget: the user's key was billed for this call (retries
            // included) whether or not the answer parses. Recording happens off
            // the request path — `publish` does not await the handler.
            this.eventBus.publish(
                new AiUsageRecordedEvent(
                    config.userId,
                    config.provider.value,
                    completion.model,
                    completion.usage.inputTokens,
                    completion.usage.outputTokens,
                    completion.usage.cacheReadInputTokens ?? 0,
                    completion.usage.cacheCreationInputTokens ?? 0,
                    new Date(),
                ),
            )

            try {
                return parse(completion.text)
            } catch (error) {
                if (!(error instanceof ModelAnswerRejection) || attempt === 2) {
                    // `err` carries the reason the answer was refused. The model's
                    // own words are never logged, and never reach the client.
                    this.logger.warn(
                        { provider: config.provider.value, model, attempts: attempt, err: error },
                        'model failed to return a usable answer',
                    )
                    throw onExhausted()
                }

                // Show the model its own answer and what was wrong with it.
                messages.push({ role: 'assistant', content: completion.text })
                messages.push({ role: 'user', content: buildRetryPrompt(error.message) })
            }
        }

        // Unreachable: the loop either returns or throws on its second pass.
        throw onExhausted()
    }
}
