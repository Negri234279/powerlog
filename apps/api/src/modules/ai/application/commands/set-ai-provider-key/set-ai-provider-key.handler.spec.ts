import { beforeEach, describe, expect, it } from 'vitest'

import { InvalidApiKeyError, ModelNotAvailableError } from '../../../../../ai/ai.errors'
import {
    FakeClock,
    FakeSecretCipher,
    InMemoryAiProviderConfigRepository,
    StubLlmProviderClient,
    stubRegistry,
} from '../../../../../../tests/doubles/ai'
import { silentLogger } from '../../../../../../tests/doubles/shared'
import { AiProviderConfigMother } from '../../../../../../tests/mothers/ai'
import { InvalidApiKeyFormatError } from '../../../domain/errors/ai-settings.errors'
import { SetAiProviderKeyCommand } from './set-ai-provider-key.command'
import { SetAiProviderKeyHandler } from './set-ai-provider-key.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const API_KEY = 'sk-test-0123456789abcdef'

const models = [
    { id: 'gpt-5', displayName: 'gpt-5' },
    { id: 'gpt-5-mini', displayName: 'gpt-5-mini' },
]

describe('SetAiProviderKeyHandler', () => {
    let configs: InMemoryAiProviderConfigRepository
    let openai: StubLlmProviderClient

    const buildHandler = (client: StubLlmProviderClient = openai) =>
        new SetAiProviderKeyHandler(
            configs,
            new FakeSecretCipher(),
            new FakeClock(),
            stubRegistry(client),
            silentLogger(),
        )

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
        openai = new StubLlmProviderClient('openai', models)
    })

    it('stores the key encrypted, never in the clear', async () => {
        const command = new SetAiProviderKeyCommand(USER_ID, 'openai', API_KEY)

        await buildHandler().execute(command)

        const [stored] = configs.all()
        expect(stored?.encryptedKey.ciphertext).not.toContain(API_KEY)
        expect(stored?.keyLast4).toBe('cdef')
    })

    it('returns a view that carries the masked hint but not the key', async () => {
        const command = new SetAiProviderKeyCommand(USER_ID, 'openai', API_KEY)

        const view = await buildHandler().execute(command)

        expect(view).toEqual({
            provider: 'openai',
            keyLast4: 'cdef',
            model: null,
            enabled: true,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
        })
    })

    it('verifies the key against the provider before persisting anything', async () => {
        const rejecting = new StubLlmProviderClient('openai', models, new InvalidApiKeyError())
        const command = new SetAiProviderKeyCommand(USER_ID, 'openai', API_KEY)

        await expect(buildHandler(rejecting).execute(command)).rejects.toThrow(InvalidApiKeyError)
        expect(configs.all()).toHaveLength(0)
    })

    it('sends the raw key to the provider to verify it', async () => {
        const command = new SetAiProviderKeyCommand(USER_ID, 'openai', API_KEY)

        await buildHandler().execute(command)

        expect(openai.listModelsCalledWith).toEqual([API_KEY])
    })

    it('rejects a model the key cannot call', async () => {
        const command = new SetAiProviderKeyCommand(USER_ID, 'openai', API_KEY, 'gpt-4-imaginary')

        await expect(buildHandler().execute(command)).rejects.toThrow(ModelNotAvailableError)
        expect(configs.all()).toHaveLength(0)
    })

    it('accepts a model the key can call', async () => {
        const command = new SetAiProviderKeyCommand(USER_ID, 'openai', API_KEY, 'gpt-5-mini')

        const view = await buildHandler().execute(command)

        expect(view.model).toBe('gpt-5-mini')
    })

    it('rejects a malformed key without calling the provider', async () => {
        const command = new SetAiProviderKeyCommand(USER_ID, 'openai', 'too-short')

        await expect(buildHandler().execute(command)).rejects.toThrow(InvalidApiKeyFormatError)
        expect(openai.listModelsCalledWith).toHaveLength(0)
    })

    it('replaces the key of an already configured provider, keeping one row', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, rawKey: 'sk-old-0123456789wxyz' }))
        const command = new SetAiProviderKeyCommand(USER_ID, 'openai', API_KEY)

        const view = await buildHandler().execute(command)

        expect(configs.all()).toHaveLength(1)
        expect(view.keyLast4).toBe('cdef')
    })

    it('keeps a user’s two providers side by side', async () => {
        configs.seed(AiProviderConfigMother.anthropic({ userId: USER_ID }))
        const command = new SetAiProviderKeyCommand(USER_ID, 'openai', API_KEY)

        await buildHandler().execute(command)

        expect(
            configs
                .all()
                .map((config) => config.provider.value)
                .sort(),
        ).toEqual(['anthropic', 'openai'])
    })
})
