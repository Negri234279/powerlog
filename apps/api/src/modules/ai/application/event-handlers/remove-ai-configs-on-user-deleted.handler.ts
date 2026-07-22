import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { AiGenerationRepository } from '../../domain/repositories/ai-generation.repository'
import { AiMesocycleDraftRepository } from '../../domain/repositories/ai-mesocycle-draft.repository'
import { AiPlanDraftRepository } from '../../domain/repositories/ai-plan-draft.repository'
import { AiProviderConfigRepository } from '../../domain/repositories/ai-provider-config.repository'
import { AiUsageRepository } from '../../domain/repositories/ai-usage.repository'

/**
 * Erases the user's AI data when they delete their account: the stored provider
 * keys — their own credentials to a third-party service — both kinds of draft,
 * which carry their training notes and their own words through the conversation
 * thread, the generations that produced them, and their usage meter, which
 * records their activity over time.
 *
 * Idempotent: re-delivery with nothing left to delete is a no-op.
 */
@EventsHandler(UserDeletedIntegrationEvent)
export class RemoveAiConfigsOnUserDeleted implements IEventHandler<UserDeletedIntegrationEvent> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly drafts: AiPlanDraftRepository,
        private readonly mesocycleDrafts: AiMesocycleDraftRepository,
        private readonly usage: AiUsageRepository,
        private readonly generations: AiGenerationRepository,
    ) {}

    async handle(event: UserDeletedIntegrationEvent): Promise<void> {
        await this.configs.deleteAllByUser(event.userId)
        await this.drafts.deleteAllByUser(event.userId)
        await this.mesocycleDrafts.deleteAllByUser(event.userId)
        await this.usage.deleteAllByUser(event.userId)
        await this.generations.deleteAllByUser(event.userId)
    }
}
