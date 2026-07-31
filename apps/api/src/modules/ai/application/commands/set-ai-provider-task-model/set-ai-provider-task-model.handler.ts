import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { Clock } from '../../ports/clock.port'
import { type AiProviderConfigView, toAiProviderConfigView } from '../../views/ai-provider-config.view'
import { SetAiProviderTaskModelCommand } from './set-ai-provider-task-model.command'

/**
 * Sets a per-task model override. Like the default model, the choice is not
 * re-validated against the provider here: a stale id surfaces as
 * `AI_MODEL_NOT_AVAILABLE` on the first completion of that task.
 */
@CommandHandler(SetAiProviderTaskModelCommand)
export class SetAiProviderTaskModelHandler implements ICommandHandler<
    SetAiProviderTaskModelCommand,
    AiProviderConfigView
> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: SetAiProviderTaskModelCommand): Promise<AiProviderConfigView> {
        const provider = AiProviderVO.create(command.provider)
        const config = await this.configs.findByUserAndProvider(command.userId, provider.value)
        if (!config) throw new AiProviderConfigNotFoundError()

        config.setTaskModel(command.kind, command.model, this.clock.now())
        await this.configs.save(config)

        return toAiProviderConfigView(config)
    }
}
