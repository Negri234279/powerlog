import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { Clock } from '../../ports/clock.port'
import { type AiProviderConfigView, toAiProviderConfigView } from '../../views/ai-provider-config.view'
import { SetAiProviderEnabledCommand } from './set-ai-provider-enabled.command'

@CommandHandler(SetAiProviderEnabledCommand)
export class SetAiProviderEnabledHandler implements ICommandHandler<SetAiProviderEnabledCommand, AiProviderConfigView> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: SetAiProviderEnabledCommand): Promise<AiProviderConfigView> {
        const provider = AiProviderVO.create(command.provider)
        const config = await this.configs.findByUserAndProvider(command.userId, provider.value)
        if (!config) throw new AiProviderConfigNotFoundError()

        config.setEnabled(command.enabled, this.clock.now())
        await this.configs.save(config)

        return toAiProviderConfigView(config)
    }
}
