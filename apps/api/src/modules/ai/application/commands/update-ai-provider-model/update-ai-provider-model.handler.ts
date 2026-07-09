import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { Clock } from '../../ports/clock.port'
import { type AiProviderConfigView, toAiProviderConfigView } from '../../views/ai-provider-config.view'
import { UpdateAiProviderModelCommand } from './update-ai-provider-model.command'

/**
 * The model is not re-validated against the provider here: the client picks it
 * from the list `aiModels` just returned, and a stale choice surfaces as
 * `AI_MODEL_NOT_AVAILABLE` on the first completion. Re-listing on every settings
 * change would mean a provider round-trip (and a provider outage blocking a
 * local edit) for no real gain.
 */
@CommandHandler(UpdateAiProviderModelCommand)
export class UpdateAiProviderModelHandler implements ICommandHandler<
    UpdateAiProviderModelCommand,
    AiProviderConfigView
> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: UpdateAiProviderModelCommand): Promise<AiProviderConfigView> {
        const provider = AiProviderVO.create(command.provider)
        const config = await this.configs.findByUserAndProvider(command.userId, provider.value)
        if (!config) throw new AiProviderConfigNotFoundError()

        config.setModel(command.model, this.clock.now())
        await this.configs.save(config)

        return toAiProviderConfigView(config)
    }
}
