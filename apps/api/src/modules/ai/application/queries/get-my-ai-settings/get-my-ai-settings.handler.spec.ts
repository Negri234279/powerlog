import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAiProviderConfigRepository } from '../../../../../../tests/doubles/ai'
import { AiProviderConfigMother } from '../../../../../../tests/mothers/ai'
import { GetMyAiSettingsQuery } from './get-my-ai-settings.query'
import { GetMyAiSettingsHandler } from './get-my-ai-settings.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'

describe('GetMyAiSettingsHandler', () => {
    let configs: InMemoryAiProviderConfigRepository

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
    })

    it('returns every provider the user has configured', async () => {
        configs.seed(
            AiProviderConfigMother.openai({ userId: USER_ID }),
            AiProviderConfigMother.anthropic({ userId: USER_ID }),
        )
        const query = new GetMyAiSettingsQuery(USER_ID)

        const views = await new GetMyAiSettingsHandler(configs).execute(query)

        expect(views.map((view) => view.provider).sort()).toEqual(['anthropic', 'openai'])
    })

    it('never exposes the stored key, only its last four characters', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, rawKey: 'sk-secret-0123456789wxyz' }))
        const query = new GetMyAiSettingsQuery(USER_ID)

        const [view] = await new GetMyAiSettingsHandler(configs).execute(query)

        expect(view?.keyLast4).toBe('wxyz')
        expect(JSON.stringify(view)).not.toContain('sk-secret')
    })

    it('does not leak another user’s configuration', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: OTHER_USER_ID }))
        const query = new GetMyAiSettingsQuery(USER_ID)

        const views = await new GetMyAiSettingsHandler(configs).execute(query)

        expect(views).toEqual([])
    })

    it('returns an empty list when nothing is configured', async () => {
        const query = new GetMyAiSettingsQuery(USER_ID)

        await expect(new GetMyAiSettingsHandler(configs).execute(query)).resolves.toEqual([])
    })
})
