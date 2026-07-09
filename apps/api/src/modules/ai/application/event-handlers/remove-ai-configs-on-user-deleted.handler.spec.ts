import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAiPlanDraftRepository, InMemoryAiProviderConfigRepository } from '../../../../../tests/doubles/ai'
import { AiPlanDraftMother, AiProviderConfigMother } from '../../../../../tests/mothers/ai'
import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { RemoveAiConfigsOnUserDeleted } from './remove-ai-configs-on-user-deleted.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'

describe('RemoveAiConfigsOnUserDeleted', () => {
    let configs: InMemoryAiProviderConfigRepository
    let drafts: InMemoryAiPlanDraftRepository

    const buildHandler = () => new RemoveAiConfigsOnUserDeleted(configs, drafts)

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
        drafts = new InMemoryAiPlanDraftRepository()
    })

    it('erases every provider key the deleted user had stored', async () => {
        configs.seed(
            AiProviderConfigMother.openai({ userId: USER_ID }),
            AiProviderConfigMother.anthropic({ userId: USER_ID }),
        )

        await buildHandler().handle(new UserDeletedIntegrationEvent(USER_ID))

        expect(configs.all()).toHaveLength(0)
    })

    it('erases their plan drafts, which carry their training notes', async () => {
        drafts.seed(AiPlanDraftMother.open({ userId: USER_ID }))

        await buildHandler().handle(new UserDeletedIntegrationEvent(USER_ID))

        expect(drafts.all()).toHaveLength(0)
    })

    it('leaves other users’ data alone', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: OTHER_USER_ID }))
        drafts.seed(AiPlanDraftMother.open({ userId: OTHER_USER_ID }))

        await buildHandler().handle(new UserDeletedIntegrationEvent(USER_ID))

        expect(configs.all()).toHaveLength(1)
        expect(drafts.all()).toHaveLength(1)
    })

    it('is idempotent on re-delivery', async () => {
        const handler = buildHandler()

        await handler.handle(new UserDeletedIntegrationEvent(USER_ID))

        await expect(handler.handle(new UserDeletedIntegrationEvent(USER_ID))).resolves.toBeUndefined()
    })
})
