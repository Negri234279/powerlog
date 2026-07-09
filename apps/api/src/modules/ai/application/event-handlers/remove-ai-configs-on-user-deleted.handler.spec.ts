import { describe, expect, it } from 'vitest'

import { InMemoryAiProviderConfigRepository } from '../../../../../tests/doubles/ai'
import { AiProviderConfigMother } from '../../../../../tests/mothers/ai'
import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { RemoveAiConfigsOnUserDeleted } from './remove-ai-configs-on-user-deleted.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'

describe('RemoveAiConfigsOnUserDeleted', () => {
    it('erases every provider key the deleted user had stored', async () => {
        const configs = new InMemoryAiProviderConfigRepository()
        configs.seed(
            AiProviderConfigMother.openai({ userId: USER_ID }),
            AiProviderConfigMother.anthropic({ userId: USER_ID }),
        )

        await new RemoveAiConfigsOnUserDeleted(configs).handle(new UserDeletedIntegrationEvent(USER_ID))

        expect(configs.all()).toHaveLength(0)
    })

    it('leaves other users’ keys alone', async () => {
        const configs = new InMemoryAiProviderConfigRepository()
        configs.seed(AiProviderConfigMother.openai({ userId: OTHER_USER_ID }))

        await new RemoveAiConfigsOnUserDeleted(configs).handle(new UserDeletedIntegrationEvent(USER_ID))

        expect(configs.all()).toHaveLength(1)
    })

    it('is idempotent on re-delivery', async () => {
        const configs = new InMemoryAiProviderConfigRepository()
        const handler = new RemoveAiConfigsOnUserDeleted(configs)

        await handler.handle(new UserDeletedIntegrationEvent(USER_ID))

        await expect(handler.handle(new UserDeletedIntegrationEvent(USER_ID))).resolves.toBeUndefined()
    })
})
