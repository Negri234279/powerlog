import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'

import type { LlmMessage } from '../../../../ai/llm-provider.port'
import { LlmProviderRegistry } from '../../../../ai/llm-provider.registry'
import type { SessionPlanContext } from '../../../../shared/contracts/session-plan-context'
import type { AiProviderConfigAggregate } from '../../domain/entities/ai-provider-config.entity'
import {
    AiModelNotSelectedError,
    InvalidAiPlanResponseError,
    NoDefaultAiProviderError,
} from '../../domain/errors/ai-plan.errors'
import { AiProviderConfigRepository } from '../../domain/repositories/ai-provider-config.repository'
import { SecretCipher } from '../ports/secret-cipher.port'
import { buildPlanUserPrompt, buildRetryPrompt, PLAN_SYSTEM_PROMPT } from './plan-prompt.service'
import { type ParsedPlan, parsePlanResponse, PlanResponseRejection } from './plan-response.parser'

/** Enough for a long session's worth of sets plus the rationale. */
const MAX_TOKENS = 4096

@Injectable()
export class SetPrescriber {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly cipher: SecretCipher,
        private readonly providers: LlmProviderRegistry,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(SetPrescriber.name)
    }

    /** The provider the user's AI features run on: their default, and enabled. */
    async resolveConfig(userId: string): Promise<AiProviderConfigAggregate> {
        const all = await this.configs.findAllByUser(userId)

        const config = all.find((candidate) => candidate.isDefault && candidate.enabled)
        if (!config) throw new NoDefaultAiProviderError()
        if (!config.model) throw new AiModelNotSelectedError()

        return config
    }

    /**
     * Asks the model to program the session. `thread` carries the refinement
     * conversation so far (empty on the first proposal).
     *
     * A malformed answer is retried **once**, telling the model exactly what was
     * wrong. Models fumble the JSON often enough that failing outright would be
     * needlessly brittle; retrying forever would just burn the user's quota.
     */
    async prescribe(
        config: AiProviderConfigAggregate,
        context: SessionPlanContext,
        thread: readonly LlmMessage[] = [],
    ): Promise<ParsedPlan> {
        const expectedSetIds = context.exercises.flatMap((exercise) => exercise.sets.map((set) => set.setId))
        const apiKey = this.cipher.decrypt(config.encryptedKey)
        const client = this.providers.for(config.provider.value)
        const model = config.model as string

        const messages: LlmMessage[] = [{ role: 'user', content: buildPlanUserPrompt(context) }, ...thread]

        for (let attempt = 1; attempt <= 2; attempt++) {
            const completion = await client.complete({
                apiKey: apiKey.value,
                model,
                system: PLAN_SYSTEM_PROMPT,
                messages,
                maxTokens: MAX_TOKENS,
            })

            try {
                return parsePlanResponse(completion.text, expectedSetIds)
            } catch (error) {
                if (!(error instanceof PlanResponseRejection) || attempt === 2) {
                    this.logger.warn(
                        { provider: config.provider.value, model, attempts: attempt },
                        'model failed to return a usable plan',
                    )
                    throw new InvalidAiPlanResponseError()
                }

                // Show the model its own answer and what was wrong with it.
                messages.push({ role: 'assistant', content: completion.text })
                messages.push({ role: 'user', content: buildRetryPrompt(error.message) })
            }
        }

        // Unreachable: the loop either returns or throws on its second pass.
        throw new InvalidAiPlanResponseError()
    }
}
