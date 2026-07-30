import { beforeEach, describe, expect, it } from 'vitest'

import { FakeClock, InMemoryAiProviderConfigRepository } from '../../../../../../tests/doubles/ai'
import { AiProviderConfigMother } from '../../../../../../tests/mothers/ai'
import { AiProviderConfigNotFoundError } from '../../../domain/errors/ai-settings.errors'
import { SetAiProviderTaskModelCommand } from './set-ai-provider-task-model.command'
import { SetAiProviderTaskModelHandler } from './set-ai-provider-task-model.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'

describe('SetAiProviderTaskModelHandler', () => {
    let configs: InMemoryAiProviderConfigRepository

    const buildHandler = () => new SetAiProviderTaskModelHandler(configs, new FakeClock())

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
    })

    it('sets the per-task model, leaving the default and the other task untouched', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, model: 'gpt-5' }))
        const command = new SetAiProviderTaskModelCommand(USER_ID, 'openai', 'mesocycle', 'claude-opus-5')

        const view = await buildHandler().execute(command)

        expect(view.mesocycleModel).toBe('claude-opus-5')
        expect(view.sessionPlanModel).toBeNull()
        expect(view.model).toBe('gpt-5')
    })

    it('clears the per-task model when given null', async () => {
        const config = AiProviderConfigMother.openai({ userId: USER_ID, model: 'gpt-5' })
        config.setTaskModel('session_plan', 'gpt-5-mini', new Date())
        configs.seed(config)
        const command = new SetAiProviderTaskModelCommand(USER_ID, 'openai', 'session_plan', null)

        const view = await buildHandler().execute(command)

        expect(view.sessionPlanModel).toBeNull()
    })

    it('fails when the provider is not configured', async () => {
        const command = new SetAiProviderTaskModelCommand(USER_ID, 'anthropic', 'mesocycle', 'claude-opus-5')

        await expect(buildHandler().execute(command)).rejects.toThrow(AiProviderConfigNotFoundError)
    })
})
