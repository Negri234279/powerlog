import { beforeEach, describe, expect, it } from 'vitest'

import { FakeClock, InMemoryAiProviderConfigRepository } from '../../../../../../tests/doubles/ai'
import { AiProviderConfigMother } from '../../../../../../tests/mothers/ai'
import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { UpdateAiProviderModelCommand } from './update-ai-provider-model.command'
import { UpdateAiProviderModelHandler } from './update-ai-provider-model.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'

describe('UpdateAiProviderModelHandler', () => {
    let configs: InMemoryAiProviderConfigRepository

    const buildHandler = () => new UpdateAiProviderModelHandler(configs, new FakeClock())

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
    })

    it('selects the model for a configured provider', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID }))
        const command = new UpdateAiProviderModelCommand(USER_ID, 'openai', 'gpt-5')

        const view = await buildHandler().execute(command)

        expect(view.model).toBe('gpt-5')
    })

    it('clears the selection when given null', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, model: 'gpt-5' }))
        const command = new UpdateAiProviderModelCommand(USER_ID, 'openai', null)

        const view = await buildHandler().execute(command)

        expect(view.model).toBeNull()
    })

    it('fails when the provider is not configured', async () => {
        const command = new UpdateAiProviderModelCommand(USER_ID, 'anthropic', 'claude-opus-4-8')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiProviderConfigNotFoundError)
    })
})
