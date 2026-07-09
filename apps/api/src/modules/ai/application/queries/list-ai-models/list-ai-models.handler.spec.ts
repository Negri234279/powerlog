import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeSecretCipher,
    InMemoryAiProviderConfigRepository,
    StubLlmProviderClient,
    stubRegistry,
} from '../../../../../../tests/doubles/ai'
import { AiProviderConfigMother } from '../../../../../../tests/mothers/ai'
import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { ListAiModelsQuery } from './list-ai-models.query'
import { ListAiModelsHandler } from './list-ai-models.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const RAW_KEY = 'sk-stored-0123456789abcd'

describe('ListAiModelsHandler', () => {
    let configs: InMemoryAiProviderConfigRepository
    let openai: StubLlmProviderClient

    const buildHandler = () => new ListAiModelsHandler(configs, new FakeSecretCipher(), stubRegistry(openai))

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
        openai = new StubLlmProviderClient('openai', [{ id: 'gpt-5', displayName: 'gpt-5' }])
    })

    it('returns the models the provider reports for the stored key', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, rawKey: RAW_KEY }))
        const query = new ListAiModelsQuery(USER_ID, 'openai')

        const models = await buildHandler().execute(query)

        expect(models).toEqual([{ id: 'gpt-5', displayName: 'gpt-5' }])
    })

    it('decrypts the stored key and hands it to the provider', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, rawKey: RAW_KEY }))
        const query = new ListAiModelsQuery(USER_ID, 'openai')

        await buildHandler().execute(query)

        expect(openai.listModelsCalledWith).toEqual([RAW_KEY])
    })

    it('fails when the user has not configured that provider', async () => {
        const query = new ListAiModelsQuery(USER_ID, 'openai')

        await expect(buildHandler().execute(query)).rejects.toThrow(AiProviderConfigNotFoundError)
    })

    it('does not read another provider’s configuration', async () => {
        configs.seed(AiProviderConfigMother.anthropic({ userId: USER_ID }))
        const query = new ListAiModelsQuery(USER_ID, 'openai')

        await expect(buildHandler().execute(query)).rejects.toThrow(AiProviderConfigNotFoundError)
    })
})
