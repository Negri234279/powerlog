import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { AiProviderConfigRepository } from '../../domain/repositories/ai-provider-config.repository'

/**
 * Erases the user's stored provider keys when they delete their account. These
 * are the user's own credentials to a third-party service — there is no reason
 * to keep them for a moment longer than the account exists.
 *
 * Idempotent: re-delivery with nothing left to delete is a no-op.
 */
@EventsHandler(UserDeletedIntegrationEvent)
export class RemoveAiConfigsOnUserDeleted implements IEventHandler<UserDeletedIntegrationEvent> {
    constructor(private readonly configs: AiProviderConfigRepository) {}

    async handle(event: UserDeletedIntegrationEvent): Promise<void> {
        await this.configs.deleteAllByUser(event.userId)
    }
}
