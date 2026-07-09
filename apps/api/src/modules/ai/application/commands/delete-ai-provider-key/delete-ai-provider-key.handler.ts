import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { DeleteAiProviderKeyCommand } from './delete-ai-provider-key.command'

/** Idempotent: deleting a provider the user never configured is a no-op. */
@CommandHandler(DeleteAiProviderKeyCommand)
export class DeleteAiProviderKeyHandler implements ICommandHandler<DeleteAiProviderKeyCommand, boolean> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(DeleteAiProviderKeyHandler.name)
    }

    async execute(command: DeleteAiProviderKeyCommand): Promise<boolean> {
        const provider = AiProviderVO.create(command.provider)

        await this.configs.delete(command.userId, provider.value)
        this.logger.info({ provider: provider.value }, 'ai provider key removed')

        return true
    }
}
