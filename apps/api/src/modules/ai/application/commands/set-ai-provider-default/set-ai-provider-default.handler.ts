import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { Clock } from '../../ports/clock.port'
import { type AiProviderConfigView, toAiProviderConfigView } from '../../views/ai-provider-config.view'
import { SetAiProviderDefaultCommand } from './set-ai-provider-default.command'

/**
 * "At most one default per user" is an invariant across aggregates, so it is
 * enforced here rather than inside one of them: every other configuration steps
 * down, and all the rows are written in a single transaction (`saveAll`).
 */
@CommandHandler(SetAiProviderDefaultCommand)
export class SetAiProviderDefaultHandler implements ICommandHandler<SetAiProviderDefaultCommand, AiProviderConfigView> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: SetAiProviderDefaultCommand): Promise<AiProviderConfigView> {
        const provider = AiProviderVO.create(command.provider)
        const all = await this.configs.findAllByUser(command.userId)

        const chosen = all.find((config) => config.provider.value === provider.value)
        if (!chosen) throw new AiProviderConfigNotFoundError()

        const now = this.clock.now()
        for (const config of all) {
            config.setDefault(config === chosen, now)
        }

        await this.configs.saveAll(all)

        return toAiProviderConfigView(chosen)
    }
}
