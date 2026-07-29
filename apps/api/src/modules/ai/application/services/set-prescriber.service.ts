import { Injectable } from '@nestjs/common'

import type { AiProvider } from '../../../../shared/ai-provider'
import type { LlmMessage } from '../../../../ai/llm-provider.port'
import type { SessionPlanContext } from '../../../../shared/contracts/session-plan-context'
import type { AiProviderConfigAggregate } from '../../domain/entities/ai-provider-config.entity'
import { InvalidAiPlanResponseError } from '../../domain/errors/ai-plan.errors'
import { AiConversation } from './ai-conversation.service'
import { AiProviderResolver } from './ai-provider-resolver.service'
import { buildPlanUserPrompt, PLAN_SYSTEM_PROMPT } from './plan-prompt.service'
import { type ParsedPlan, parsePlanResponse } from './plan-response.parser'

@Injectable()
export class SetPrescriber {
    constructor(
        private readonly resolver: AiProviderResolver,
        private readonly conversation: AiConversation,
    ) {}

    /** The provider the user's AI features run on: their default, and enabled. */
    async resolveConfig(userId: string): Promise<AiProviderConfigAggregate> {
        return this.resolver.resolve(userId)
    }

    /** The config for a specific provider (a refinement runs on the draft's own). */
    async resolveConfigForProvider(userId: string, provider: AiProvider): Promise<AiProviderConfigAggregate> {
        return this.resolver.resolveProvider(userId, provider)
    }

    /**
     * Asks the model to program the session. `thread` carries the refinement
     * conversation so far (empty on the first proposal), and `model` forces the
     * draft's model on a refinement so the conversation stays on one model.
     */
    async prescribe(
        config: AiProviderConfigAggregate,
        context: SessionPlanContext,
        options: { thread?: readonly LlmMessage[]; extraInfo?: string | null; model?: string } = {},
    ): Promise<ParsedPlan> {
        const expectedEntryIds = context.exercises.map((exercise) => exercise.entryId)
        const messages: LlmMessage[] = [
            { role: 'user', content: buildPlanUserPrompt(context, options.extraInfo) },
            ...(options.thread ?? []),
        ]

        return this.conversation.ask(
            config,
            { system: PLAN_SYSTEM_PROMPT, messages, model: options.model },
            (text) => parsePlanResponse(text, expectedEntryIds),
            () => new InvalidAiPlanResponseError(),
        )
    }
}
