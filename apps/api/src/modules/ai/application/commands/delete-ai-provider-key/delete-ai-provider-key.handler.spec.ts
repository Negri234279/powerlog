import { beforeEach, describe, expect, it } from 'vitest'

import { FakeClock, InMemoryAiProviderConfigRepository } from '../../../../../../tests/doubles/ai'
import { silentLogger } from '../../../../../../tests/doubles/shared'
import { AiProviderConfigMother } from '../../../../../../tests/mothers/ai'
import { InvalidAiProviderError } from '../../../domain/errors/ai-settings.errors'
import { DeleteAiProviderKeyCommand } from './delete-ai-provider-key.command'
import { DeleteAiProviderKeyHandler } from './delete-ai-provider-key.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'

describe('DeleteAiProviderKeyHandler', () => {
    let configs: InMemoryAiProviderConfigRepository

    const buildHandler = () => new DeleteAiProviderKeyHandler(configs, new FakeClock(), silentLogger())

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
    })

    it('forgets the stored key for that provider', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID }))
        const command = new DeleteAiProviderKeyCommand(USER_ID, 'openai')

        await buildHandler().execute(command)

        expect(configs.all()).toHaveLength(0)
    })

    it('leaves the user’s other provider untouched', async () => {
        configs.seed(
            AiProviderConfigMother.openai({ userId: USER_ID }),
            AiProviderConfigMother.anthropic({ userId: USER_ID }),
        )
        const command = new DeleteAiProviderKeyCommand(USER_ID, 'openai')

        await buildHandler().execute(command)

        expect(configs.all().map((config) => config.provider.value)).toEqual(['anthropic'])
    })

    it('promotes the remaining provider when the default is removed', async () => {
        configs.seed(
            AiProviderConfigMother.openai({ userId: USER_ID, isDefault: true }),
            AiProviderConfigMother.anthropic({ userId: USER_ID }),
        )
        const command = new DeleteAiProviderKeyCommand(USER_ID, 'openai')

        await buildHandler().execute(command)

        // Otherwise the user keeps a key but the AI features have no provider.
        expect(configs.all().map((config) => [config.provider.value, config.isDefault])).toEqual([['anthropic', true]])
    })

    it('leaves the default alone when a non-default provider is removed', async () => {
        configs.seed(
            AiProviderConfigMother.openai({ userId: USER_ID, isDefault: true }),
            AiProviderConfigMother.anthropic({ userId: USER_ID }),
        )
        const command = new DeleteAiProviderKeyCommand(USER_ID, 'anthropic')

        await buildHandler().execute(command)

        expect(configs.all().map((config) => [config.provider.value, config.isDefault])).toEqual([['openai', true]])
    })

    it('is idempotent when nothing is configured', async () => {
        const command = new DeleteAiProviderKeyCommand(USER_ID, 'openai')

        await expect(buildHandler().execute(command)).resolves.toBe(true)
    })

    it('rejects an unsupported provider', async () => {
        const command = new DeleteAiProviderKeyCommand(USER_ID, 'gemini')

        await expect(buildHandler().execute(command)).rejects.toThrow(InvalidAiProviderError)
    })
})
