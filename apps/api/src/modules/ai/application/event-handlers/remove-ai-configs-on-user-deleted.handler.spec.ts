import { beforeEach, describe, expect, it } from 'vitest'

import {
    InMemoryAiGenerationRepository,
    InMemoryAiMesocycleDraftRepository,
    InMemoryAiPlanDraftRepository,
    InMemoryAiProviderConfigRepository,
    InMemoryAiUsageRepository,
} from '../../../../../tests/doubles/ai'
import type { AiUsageEntry } from '../../domain/repositories/ai-usage.repository'
import {
    AiGenerationMother,
    AiMesocycleDraftMother,
    AiPlanDraftMother,
    AiProviderConfigMother,
    sessionPlanRequest,
} from '../../../../../tests/mothers/ai'
import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { RemoveAiConfigsOnUserDeleted } from './remove-ai-configs-on-user-deleted.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'

const usageEntry = (userId: string): AiUsageEntry => ({
    userId,
    provider: 'openai',
    model: 'gpt-5',
    inputTokens: 100,
    outputTokens: 50,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    inputPricePerMTok: null,
    outputPricePerMTok: null,
    inputCost: null,
    outputCost: null,
    totalCost: null,
    currency: 'USD',
    createdAt: new Date(),
})

describe('RemoveAiConfigsOnUserDeleted', () => {
    let configs: InMemoryAiProviderConfigRepository
    let drafts: InMemoryAiPlanDraftRepository
    let mesocycleDrafts: InMemoryAiMesocycleDraftRepository
    let usage: InMemoryAiUsageRepository
    let generations: InMemoryAiGenerationRepository

    const buildHandler = () => new RemoveAiConfigsOnUserDeleted(configs, drafts, mesocycleDrafts, usage, generations)

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
        drafts = new InMemoryAiPlanDraftRepository()
        mesocycleDrafts = new InMemoryAiMesocycleDraftRepository()
        usage = new InMemoryAiUsageRepository()
        generations = new InMemoryAiGenerationRepository()
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

    it('erases their mesocycle drafts, which carry their own words', async () => {
        mesocycleDrafts.seed(AiMesocycleDraftMother.open({ userId: USER_ID }))

        await buildHandler().handle(new UserDeletedIntegrationEvent(USER_ID))

        expect(mesocycleDrafts.all()).toHaveLength(0)
    })

    it('erases their usage meter, which records their activity over time', async () => {
        usage.seed(usageEntry(USER_ID), usageEntry(USER_ID))

        await buildHandler().handle(new UserDeletedIntegrationEvent(USER_ID))

        expect(usage.all()).toHaveLength(0)
    })

    it('erases the generations that produced those drafts', async () => {
        generations.seed(AiGenerationMother.sessionPlan(sessionPlanRequest(), { userId: USER_ID }))

        await buildHandler().handle(new UserDeletedIntegrationEvent(USER_ID))

        expect(generations.all()).toHaveLength(0)
    })

    it('leaves other users’ data alone', async () => {
        configs.seed(AiProviderConfigMother.openai({ userId: OTHER_USER_ID }))
        drafts.seed(AiPlanDraftMother.open({ userId: OTHER_USER_ID }))
        mesocycleDrafts.seed(AiMesocycleDraftMother.open({ userId: OTHER_USER_ID }))
        usage.seed(usageEntry(OTHER_USER_ID))
        generations.seed(AiGenerationMother.sessionPlan(sessionPlanRequest(), { userId: OTHER_USER_ID }))

        await buildHandler().handle(new UserDeletedIntegrationEvent(USER_ID))

        expect(configs.all()).toHaveLength(1)
        expect(drafts.all()).toHaveLength(1)
        expect(mesocycleDrafts.all()).toHaveLength(1)
        expect(usage.all()).toHaveLength(1)
        expect(generations.all()).toHaveLength(1)
    })

    it('is idempotent on re-delivery', async () => {
        const handler = buildHandler()

        await handler.handle(new UserDeletedIntegrationEvent(USER_ID))

        await expect(handler.handle(new UserDeletedIntegrationEvent(USER_ID))).resolves.toBeUndefined()
    })
})
