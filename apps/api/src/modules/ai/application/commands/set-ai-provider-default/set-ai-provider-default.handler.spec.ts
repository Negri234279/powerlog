import { beforeEach, describe, expect, it } from 'vitest'

import { FakeClock, InMemoryAiProviderConfigRepository } from '../../../../../../tests/doubles/ai'
import { AiProviderConfigMother } from '../../../../../../tests/mothers/ai'
import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { SetAiProviderDefaultCommand } from './set-ai-provider-default.command'
import { SetAiProviderDefaultHandler } from './set-ai-provider-default.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const defaultsOf = (configs: InMemoryAiProviderConfigRepository) =>
    configs
        .all()
        .filter((config) => config.isDefault)
        .map((config) => config.provider.value)

describe('SetAiProviderDefaultHandler', () => {
    let configs: InMemoryAiProviderConfigRepository

    const buildHandler = () => new SetAiProviderDefaultHandler(configs, new FakeClock())

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
    })

    it('makes the chosen provider the default', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID }))
        const command = new SetAiProviderDefaultCommand(USER_ID, 'openai')

        const view = await buildHandler().execute(command)

        expect(view.isDefault).toBe(true)
    })

    it('steps the previous default down, leaving exactly one', async () => {
        configs.seed(
            AiProviderConfigMother.openai({ userId: USER_ID, isDefault: true }),
            AiProviderConfigMother.anthropic({ userId: USER_ID }),
        )
        const command = new SetAiProviderDefaultCommand(USER_ID, 'anthropic')

        await buildHandler().execute(command)

        expect(defaultsOf(configs)).toEqual(['anthropic'])
    })

    it('is idempotent when the provider is already the default', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, isDefault: true }))
        const command = new SetAiProviderDefaultCommand(USER_ID, 'openai')

        await buildHandler().execute(command)

        expect(defaultsOf(configs)).toEqual(['openai'])
    })

    it('fails when the provider is not configured', async () => {
        const command = new SetAiProviderDefaultCommand(USER_ID, 'openai')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiProviderConfigNotFoundError)
    })

    it('does not touch another user’s default', async () => {
        const other = '22222222-2222-4222-8222-222222222222'
        configs.seed(
            AiProviderConfigMother.openai({ userId: USER_ID }),
            AiProviderConfigMother.anthropic({ userId: other, isDefault: true }),
        )
        const command = new SetAiProviderDefaultCommand(USER_ID, 'openai')

        await buildHandler().execute(command)

        expect(defaultsOf(configs).sort()).toEqual(['anthropic', 'openai'])
    })
})
