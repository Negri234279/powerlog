import { Injectable } from '@nestjs/common'

import type { AiProvider } from '../../../../shared/ai-provider'
import type { LlmMessage, LlmSystemBlock } from '../../../../ai/llm-provider.port'
import type { CatalogExercise, MesocycleDesignContext } from '../../../../shared/contracts/mesocycle-design-context'
import type { AiProviderConfigAggregate } from '../../domain/entities/ai-provider-config.entity'
import { InvalidAiMesocycleResponseError } from '../../domain/errors/ai-mesocycle.errors'
import { AiGenerationMetrics } from '../ports/ai-generation-metrics.port'
import { AiConversation } from './ai-conversation.service'
import { AiProviderResolver } from './ai-provider-resolver.service'
import {
    buildMesocycleCatalogBlock,
    buildMesocycleUserPrompt,
    MESOCYCLE_SYSTEM_PROMPT,
    type MesocycleDesignRequest,
} from './mesocycle-prompt.service'
import { type ParsedMesocycle, parseMesocycleResponse } from './mesocycle-response.parser'
import { evaluateMesocycleRules } from './programming-rules'
import { goalToObjective } from './programming-rules.config'

@Injectable()
export class MesocycleDesigner {
    constructor(
        private readonly resolver: AiProviderResolver,
        private readonly conversation: AiConversation,
        private readonly metrics: AiGenerationMetrics,
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
     * Asks the model to design the block's template week. `thread` carries the
     * refinement conversation so far (empty on the first proposal), and `model`
     * forces the draft's model on a refinement so the prompt cache survives.
     */
    async design(
        config: AiProviderConfigAggregate,
        context: MesocycleDesignContext,
        request: MesocycleDesignRequest,
        options: { thread?: readonly LlmMessage[]; model?: string } = {},
    ): Promise<ParsedMesocycle> {
        const catalog = indexBySlug(context.catalog)
        const objective = goalToObjective(request.goal)
        // Two system blocks: the fixed coaching brief, then the catalog behind a
        // cache cut point. The catalog is byte-identical across users and calls, so
        // it is read from cache from the second call on (a refinement, or the next
        // athlete on the same model) — provided the prefix before it never varies.
        const system: LlmSystemBlock[] = [
            { text: MESOCYCLE_SYSTEM_PROMPT },
            { text: buildMesocycleCatalogBlock(context.catalog), cache: true },
        ]
        const messages: LlmMessage[] = [
            { role: 'user', content: buildMesocycleUserPrompt(context, request) },
            ...(options.thread ?? []),
        ]

        return this.conversation.ask(
            config,
            { system, messages, model: options.model },
            // Structural parse first, then the training rules: a hard violation
            // throws ModelAnswerRejection and rides the same one-shot retry, while
            // soft warnings are counted on the answer that was ultimately kept.
            (text) => {
                const parsed = parseMesocycleResponse(text, catalog, request.trainingDays)
                const { warnings } = evaluateMesocycleRules(parsed.proposal, catalog, { objective })
                for (const rule of warnings) this.metrics.recordRuleWarning(rule)

                return parsed
            },
            () => new InvalidAiMesocycleResponseError(),
        )
    }
}

function indexBySlug(catalog: readonly CatalogExercise[]): ReadonlyMap<string, CatalogExercise> {
    return new Map(catalog.map((exercise) => [exercise.slug, exercise]))
}
