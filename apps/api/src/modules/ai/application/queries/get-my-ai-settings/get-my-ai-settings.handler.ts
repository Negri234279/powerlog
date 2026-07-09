import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { type AiProviderConfigView, toAiProviderConfigView } from '../../views/ai-provider-config.view'
import { GetMyAiSettingsQuery } from './get-my-ai-settings.query'

@QueryHandler(GetMyAiSettingsQuery)
export class GetMyAiSettingsHandler implements IQueryHandler<GetMyAiSettingsQuery, AiProviderConfigView[]> {
    constructor(private readonly configs: AiProviderConfigRepository) {}

    async execute(query: GetMyAiSettingsQuery): Promise<AiProviderConfigView[]> {
        const configs = await this.configs.findAllByUser(query.userId)

        return configs.map(toAiProviderConfigView)
    }
}
