import { beforeEach, describe, expect, it } from 'vitest'

import { FakeClock, InMemoryAiProviderConfigRepository } from '../../../../../../tests/doubles/ai'
import { AiProviderConfigMother } from '../../../../../../tests/mothers/ai'
import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { SetAiProviderEnabledCommand } from './set-ai-provider-enabled.command'
import { SetAiProviderEnabledHandler } from './set-ai-provider-enabled.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'

describe('SetAiProviderEnabledHandler', () => {
    let configs: InMemoryAiProviderConfigRepository

    const buildHandler = () => new SetAiProviderEnabledHandler(configs, new FakeClock())

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
    })

    it('disables a provider while keeping its stored key', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID }))
        const command = new SetAiProviderEnabledCommand(USER_ID, 'openai', false)

        const view = await buildHandler().execute(command)

        expect(view.enabled).toBe(false)
        expect(view.keyLast4).toBe('abcd')
        expect(configs.all()).toHaveLength(1)
    })

    it('re-enables a disabled provider', async () => {
        const config = AiProviderConfigMother.openai({ userId: USER_ID })
        config.setEnabled(false, new Date())
        configs.seed(config)
        const command = new SetAiProviderEnabledCommand(USER_ID, 'openai', true)

        const view = await buildHandler().execute(command)

        expect(view.enabled).toBe(true)
    })

    it('fails when the provider is not configured', async () => {
        const command = new SetAiProviderEnabledCommand(USER_ID, 'openai', false)

        await expect(buildHandler().execute(command)).rejects.toThrow(AiProviderConfigNotFoundError)
    })
})
