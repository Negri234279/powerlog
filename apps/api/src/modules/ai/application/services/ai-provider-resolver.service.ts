import { Injectable } from '@nestjs/common'

import type { AiProviderConfigAggregate } from '../../domain/entities/ai-provider-config.entity'
import { AiModelNotSelectedError, NoDefaultAiProviderError } from '../../domain/errors/ai-plan.errors'
import { AiProviderConfigRepository } from '../../domain/repositories/ai-provider-config.repository'

/**
 * Which provider the user's AI features run on. Every feature resolves it the
 * same way and fails the same way, before the athlete waits on anything.
 */
@Injectable()
export class AiProviderResolver {
    constructor(private readonly configs: AiProviderConfigRepository) {}

    /** The user's default provider, enabled, with a model chosen. */
    async resolve(userId: string): Promise<AiProviderConfigAggregate> {
        const all = await this.configs.findAllByUser(userId)

        const config = all.find((candidate) => candidate.isDefault && candidate.enabled)
        if (!config) throw new NoDefaultAiProviderError()
        if (!config.model) throw new AiModelNotSelectedError()

        return config
    }
}
