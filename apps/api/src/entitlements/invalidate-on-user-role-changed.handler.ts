import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserRoleChangedIntegrationEvent } from '../shared/integration-events/user-role-changed.integration-event'
import { EntitlementsCache } from './entitlements.cache'

/**
 * Without a live subscription, a user's entitlements are the free plan of their
 * ROLE — so promoting someone to coach changes what they may do just as much as a
 * payment does, and the cached answer has to go with it. Otherwise a brand-new
 * coach spends up to a minute being told they may not take on athletes, on the
 * authority of the athlete plan they no longer hold.
 */
@EventsHandler(UserRoleChangedIntegrationEvent)
export class InvalidateEntitlementsOnUserRoleChanged implements IEventHandler<UserRoleChangedIntegrationEvent> {
    constructor(private readonly cache: EntitlementsCache) {}

    async handle(event: UserRoleChangedIntegrationEvent): Promise<void> {
        await this.cache.invalidate(event.userId)
    }
}
