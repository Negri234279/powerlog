import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { AiMesocycleDraftRepository } from '../../domain/repositories/ai-mesocycle-draft.repository'
import { AiPlanDraftRepository } from '../../domain/repositories/ai-plan-draft.repository'
import { AiProviderConfigRepository } from '../../domain/repositories/ai-provider-config.repository'

/**
 * Erases the user's AI data when they delete their account: the stored provider
 * keys — their own credentials to a third-party service — and both kinds of
 * draft, which carry their training notes and their own words through the
 * conversation thread.
 *
 * Idempotent: re-delivery with nothing left to delete is a no-op.
 */
@EventsHandler(UserDeletedIntegrationEvent)
export class RemoveAiConfigsOnUserDeleted implements IEventHandler<UserDeletedIntegrationEvent> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly drafts: AiPlanDraftRepository,
        private readonly mesocycleDrafts: AiMesocycleDraftRepository,
    ) {}

    async handle(event: UserDeletedIntegrationEvent): Promise<void> {
        await this.configs.deleteAllByUser(event.userId)
        await this.drafts.deleteAllByUser(event.userId)
        await this.mesocycleDrafts.deleteAllByUser(event.userId)
    }
}
