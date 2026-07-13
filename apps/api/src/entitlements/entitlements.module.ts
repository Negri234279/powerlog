import { Global, Module } from '@nestjs/common'

import { Entitlements } from '../shared/contracts/entitlements'
import { EntitlementsCache } from './entitlements.cache'
import { FlushEntitlementsOnPlanCatalogChanged } from './flush-on-plan-catalog-changed.handler'
import { InvalidateEntitlementsOnSubscriptionChanged } from './invalidate-on-subscription-changed.handler'
import { PlanAwareEntitlements } from './plan-aware-entitlements'

/**
 * Provides the {@link Entitlements} port app-wide. Global so any feature module
 * can inject it without importing this module, and kept outside `src/modules/` so
 * the boundaries rules don't treat it as a foreign module.
 *
 * The adapter answers from the user's plan, asking billing over the QueryBus —
 * so the gated modules never import billing, and billing never imports them.
 */
@Global()
@Module({
    providers: [
        EntitlementsCache,
        // Drops a user's cached answer the moment their subscription moves. Without
        // it the cache could not exist: someone who just paid would sit on the free
        // plan for up to a minute.
        InvalidateEntitlementsOnSubscriptionChanged,
        // A plan edit is retroactive by design, so the whole cache goes with it.
        FlushEntitlementsOnPlanCatalogChanged,
        { provide: Entitlements, useClass: PlanAwareEntitlements },
    ],
    exports: [Entitlements],
})
export class EntitlementsModule {}
