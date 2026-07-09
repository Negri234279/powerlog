import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { AiPlanDraftRepository } from '../../domain/repositories/ai-plan-draft.repository'
import { AiProviderConfigRepository } from '../../domain/repositories/ai-provider-config.repository'

/**
 * Erases the user's AI data when they delete their account: the stored provider
 * keys — their own credentials to a third-party service — and the plan drafts,
 * which carry their training notes through the model's rationale.
 *
 * Idempotent: re-delivery with nothing left to delete is a no-op.
 */
@EventsHandler(UserDeletedIntegrationEvent)
export class RemoveAiConfigsOnUserDeleted implements IEventHandler<UserDeletedIntegrationEvent> {
    constructor(
        private readonly configs: AiProviderConfigRepository,
        private readonly drafts: AiPlanDraftRepository,
    ) {}

    async handle(event: UserDeletedIntegrationEvent): Promise<void> {
        await this.configs.deleteAllByUser(event.userId)
        await this.drafts.deleteAllByUser(event.userId)
    }
}
