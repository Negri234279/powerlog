import { Injectable } from '@nestjs/common'

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

    /**
     * Asks the model to program the session. `thread` carries the refinement
     * conversation so far (empty on the first proposal).
     */
    async prescribe(
        config: AiProviderConfigAggregate,
        context: SessionPlanContext,
        options: { thread?: readonly LlmMessage[]; extraInfo?: string | null } = {},
    ): Promise<ParsedPlan> {
        const expectedEntryIds = context.exercises.map((exercise) => exercise.entryId)
        const messages: LlmMessage[] = [
            { role: 'user', content: buildPlanUserPrompt(context, options.extraInfo) },
            ...(options.thread ?? []),
        ]

        return this.conversation.ask(
            config,
            { system: PLAN_SYSTEM_PROMPT, messages },
            (text) => parsePlanResponse(text, expectedEntryIds),
            () => new InvalidAiPlanResponseError(),
        )
    }
}
