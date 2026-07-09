import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { LlmModel } from '../../../../../ai/llm-provider.port'
import { LlmProviderRegistry } from '../../../../../ai/llm-provider.registry'
import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { SecretCipher } from '../../ports/secret-cipher.port'
import { ListAiModelsQuery } from './list-ai-models.query'

@QueryHandler(ListAiModelsQuery)
export class ListAiModelsHandler implements IQueryHandler<ListAiModelsQuery, LlmModel[]> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly cipher: SecretCipher,
        private readonly providers: LlmProviderRegistry,
    ) {}

    async execute(query: ListAiModelsQuery): Promise<LlmModel[]> {
        const provider = AiProviderVO.create(query.provider)
        const config = await this.configs.findByUserAndProvider(query.userId, provider.value)
        if (!config) throw new AiProviderConfigNotFoundError()

        // The decrypted key lives only for the length of this call.
        const apiKey = this.cipher.decrypt(config.encryptedKey)

        return this.providers.for(provider.value).listModels(apiKey.value)
    }
}
