import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { ModelNotAvailableError } from '../../../../../ai/ai.errors'
import { LlmProviderRegistry } from '../../../../../ai/llm-provider.registry'
import { AiProviderConfigAggregate } from '../../../domain/entities/ai-provider-config.entity'
import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { ApiKeyVO } from '../../../domain/value-objects/api-key.vo'
import { Clock } from '../../ports/clock.port'
import { SecretCipher } from '../../ports/secret-cipher.port'
import { type AiProviderConfigView, toAiProviderConfigView } from '../../views/ai-provider-config.view'
import { SetAiProviderKeyCommand } from './set-ai-provider-key.command'

@CommandHandler(SetAiProviderKeyCommand)
export class SetAiProviderKeyHandler implements ICommandHandler<SetAiProviderKeyCommand, AiProviderConfigView> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly cipher: SecretCipher,
        private readonly clock: Clock,
        private readonly providers: LlmProviderRegistry,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(SetAiProviderKeyHandler.name)
    }

    async execute(command: SetAiProviderKeyCommand): Promise<AiProviderConfigView> {
        const provider = AiProviderVO.create(command.provider)
        const apiKey = ApiKeyVO.create(command.apiKey)

        // Listing models proves the key works before anything is persisted: a
        // rejected key raises InvalidApiKeyError here rather than failing later,
        // in the middle of an analysis the user asked for.
        const models = await this.providers.for(provider.value).listModels(apiKey.value)

        if (command.model && !models.some((model) => model.id === command.model)) {
            throw new ModelNotAvailableError()
        }

        const now = this.clock.now()
        const encryptedKey = this.cipher.encrypt(apiKey)
        const all = await this.configs.findAllByUser(command.userId)
        const existing = all.find((config) => config.provider.value === provider.value)

        if (existing) {
            existing.replaceKey(encryptedKey, apiKey.last4, now)
            if (command.model !== undefined) existing.setModel(command.model, now)
        }

        const config =
            existing ??
            AiProviderConfigAggregate.create({
                userId: command.userId,
                provider,
                encryptedKey,
                keyLast4: apiKey.last4,
                model: command.model,
                // Nothing configured yet: this one becomes the default, so the AI
                // features have a provider to reach for without a second step.
                isDefault: all.length === 0,
                now,
            })

        await this.configs.save(config)
        this.logger.info({ provider: provider.value, replaced: existing !== null }, 'ai provider key configured')

        return toAiProviderConfigView(config)
    }
}
