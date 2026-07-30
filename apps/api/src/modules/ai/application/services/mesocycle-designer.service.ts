import { Injectable } from '@nestjs/common'

import type { AiProvider } from '../../../../shared/ai-provider'
import type { LlmMessage, LlmSystemBlock } from '../../../../ai/llm-provider.port'
import type { CatalogExercise, MesocycleDesignContext } from '../../../../shared/contracts/mesocycle-design-context'
import type { MesocycleDraftProposal } from '../../domain/entities/ai-mesocycle-draft.entity'
import type { AiProviderConfigAggregate } from '../../domain/entities/ai-provider-config.entity'
import { InvalidAiMesocycleResponseError } from '../../domain/errors/ai-mesocycle.errors'
import { type ExpansionContext, expandMicrocycles } from '../../domain/mesocycle-expander'
import { AiGenerationMetrics } from '../ports/ai-generation-metrics.port'
import { AiConversation } from './ai-conversation.service'
import { AiProviderResolver } from './ai-provider-resolver.service'
import {
    buildMesocycleCatalogBlock,
    buildMesocycleUserPrompt,
    MESOCYCLE_SYSTEM_PROMPT,
    type MesocycleDesignRequest,
} from './mesocycle-prompt.service'
import { fillMesocycleLoads } from './mesocycle-load-filler'
import { parseMesocycleResponse } from './mesocycle-response.parser'
import { assertProgressionIsSound, evaluateMesocycleRules } from './programming-rules'
import { goalToObjective } from './programming-rules.config'

/** A designed block: the model's rationale and the fully expanded proposal. */
export interface DesignedMesocycle {
    rationale: string
    proposal: MesocycleDraftProposal
}

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
    ): Promise<DesignedMesocycle> {
        const catalog = indexBySlug(context.catalog)
        const objective = goalToObjective(request.goal)
        const expansion = buildExpansionContext(context)
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
                // The model returned the template week's reps + intensity; the
                // backend computes the kilos (IA.5), then expands the week into the
                // block's microcycles by the progression (IA.7).
                const days = fillMesocycleLoads(parsed.days, catalog, context.strength)
                const microcycles = expandMicrocycles(days, parsed.progression, request.weeks, expansion)
                const proposal: MesocycleDraftProposal = {
                    name: parsed.name,
                    days,
                    progression: parsed.progression,
                    microcycles,
                }

                // Single-week rules on the template, then progression rules on the
                // whole block; both throw ModelAnswerRejection to ride the retry.
                const { warnings } = evaluateMesocycleRules(proposal, catalog, { objective })
                assertProgressionIsSound(microcycles, catalog, {
                    objective,
                    weeks: request.weeks,
                    progression: parsed.progression,
                })
                for (const rule of warnings) this.metrics.recordRuleWarning(rule)

                return { rationale: parsed.rationale, proposal }
            },
            () => new InvalidAiMesocycleResponseError(),
        )
    }
}

function indexBySlug(catalog: readonly CatalogExercise[]): ReadonlyMap<string, CatalogExercise> {
    return new Map(catalog.map((exercise) => [exercise.slug, exercise]))
}

/** Per-slug e1RM + taxonomy the expander needs to progress loads each week. */
function buildExpansionContext(context: MesocycleDesignContext): ExpansionContext {
    return {
        e1rmBySlug: new Map(context.strength.map((lift) => [lift.slug, lift.e1rmKg])),
        equipmentBySlug: new Map(context.catalog.map((exercise) => [exercise.slug, exercise.equipment])),
        categoryBySlug: new Map(context.catalog.map((exercise) => [exercise.slug, exercise.category])),
    }
}
