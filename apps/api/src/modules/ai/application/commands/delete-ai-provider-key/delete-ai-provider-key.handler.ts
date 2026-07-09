import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { Clock } from '../../ports/clock.port'
import { DeleteAiProviderKeyCommand } from './delete-ai-provider-key.command'

/** Idempotent: deleting a provider the user never configured is a no-op. */
@CommandHandler(DeleteAiProviderKeyCommand)
export class DeleteAiProviderKeyHandler implements ICommandHandler<DeleteAiProviderKeyCommand, boolean> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(DeleteAiProviderKeyHandler.name)
    }

    async execute(command: DeleteAiProviderKeyCommand): Promise<boolean> {
        const provider = AiProviderVO.create(command.provider)
        const all = await this.configs.findAllByUser(command.userId)
        const target = all.find((config) => config.provider.value === provider.value)
        if (!target) return true

        await this.configs.delete(command.userId, provider.value)

        // Removing the default would otherwise leave the user with keys but no
        // provider for the AI features to reach for. Promote whatever remains.
        const remaining = all.filter((config) => config !== target)
        const heir = remaining[0]
        if (target.isDefault && heir) {
            heir.setDefault(true, this.clock.now())
            await this.configs.save(heir)
        }

        this.logger.info(
            { provider: provider.value, promoted: heir?.provider.value ?? null },
            'ai provider key removed',
        )

        return true
    }
}
