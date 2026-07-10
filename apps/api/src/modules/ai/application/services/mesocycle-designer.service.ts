import { Injectable } from '@nestjs/common'

import type { LlmMessage } from '../../../../ai/llm-provider.port'
import type { CatalogExercise, MesocycleDesignContext } from '../../../../shared/contracts/mesocycle-design-context'
import type { AiProviderConfigAggregate } from '../../domain/entities/ai-provider-config.entity'
import { InvalidAiMesocycleResponseError } from '../../domain/errors/ai-mesocycle.errors'
import { AiConversation } from './ai-conversation.service'
import { AiProviderResolver } from './ai-provider-resolver.service'
import {
    buildMesocycleUserPrompt,
    MESOCYCLE_SYSTEM_PROMPT,
    type MesocycleDesignRequest,
} from './mesocycle-prompt.service'
import { type ParsedMesocycle, parseMesocycleResponse } from './mesocycle-response.parser'

@Injectable()
export class MesocycleDesigner {
    constructor(
        private readonly resolver: AiProviderResolver,
        private readonly conversation: AiConversation,
    ) {}

    /** The provider the user's AI features run on: their default, and enabled. */
    async resolveConfig(userId: string): Promise<AiProviderConfigAggregate> {
        return this.resolver.resolve(userId)
    }

    /**
     * Asks the model to design the block's template week. `thread` carries the
     * refinement conversation so far (empty on the first proposal).
     */
    async design(
        config: AiProviderConfigAggregate,
        context: MesocycleDesignContext,
        request: MesocycleDesignRequest,
        options: { thread?: readonly LlmMessage[] } = {},
    ): Promise<ParsedMesocycle> {
        const catalog = indexBySlug(context.catalog)
        const messages: LlmMessage[] = [
            { role: 'user', content: buildMesocycleUserPrompt(context, request) },
            ...(options.thread ?? []),
        ]

        return this.conversation.ask(
            config,
            { system: MESOCYCLE_SYSTEM_PROMPT, messages },
            (text) => parseMesocycleResponse(text, catalog, request.trainingDays),
            () => new InvalidAiMesocycleResponseError(),
        )
    }
}

function indexBySlug(catalog: readonly CatalogExercise[]): ReadonlyMap<string, CatalogExercise> {
    return new Map(catalog.map((exercise) => [exercise.slug, exercise]))
}
