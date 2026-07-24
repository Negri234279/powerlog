import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { PlanCatalogChangedIntegrationEvent } from '../shared/integration-events/plan-catalog-changed.integration-event'
import { EntitlementsCache } from './entitlements.cache'

/**
 * A plan changed, so every cached answer is suspect. We cannot know who is on the
 * plan without asking — and the answer to that is exactly what is cached — so the
 * whole cache goes.
 *
 * It is an admin action, and Redis is shared, so a flush is cheap and reaches
 * every replica at once.
 */
@EventsHandler(PlanCatalogChangedIntegrationEvent)
export class FlushEntitlementsOnPlanCatalogChanged implements IEventHandler<PlanCatalogChangedIntegrationEvent> {
    constructor(private readonly cache: EntitlementsCache) {}

    async handle(): Promise<void> {
        await this.cache.invalidateAll()
    }
}
