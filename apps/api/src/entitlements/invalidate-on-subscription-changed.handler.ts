import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { SubscriptionChangedIntegrationEvent } from '../shared/integration-events/subscription-changed.integration-event'
import { EntitlementsCache } from './entitlements.cache'

/**
 * The moment a subscription moves, what the user may do has changed — so the
 * cached answer has to go. This is what lets the cache exist at all: without it,
 * someone who just paid would sit on the free plan for up to a minute, staring at
 * an upgrade button they already pressed.
 */
@EventsHandler(SubscriptionChangedIntegrationEvent)
export class InvalidateEntitlementsOnSubscriptionChanged implements IEventHandler<SubscriptionChangedIntegrationEvent> {
    constructor(private readonly cache: EntitlementsCache) {}

    async handle(event: SubscriptionChangedIntegrationEvent): Promise<void> {
        await this.cache.invalidate(event.userId)
    }
}
