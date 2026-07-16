import { Global, Module } from '@nestjs/common'

import { Entitlements } from '../shared/contracts/entitlements'
import { PlanDirectory } from '../shared/contracts/plan-membership'
import { EntitlementsCache } from './entitlements.cache'
import { FlushEntitlementsOnPlanCatalogChanged } from './flush-on-plan-catalog-changed.handler'
import { InvalidateEntitlementsOnSubscriptionChanged } from './invalidate-on-subscription-changed.handler'
import { InvalidateEntitlementsOnUserRoleChanged } from './invalidate-on-user-role-changed.handler'
import { PlanAwareEntitlements } from './plan-aware-entitlements'
import { PlanAwarePlanDirectory } from './plan-aware-plan-directory'

/**
 * Provides the {@link Entitlements} and {@link PlanDirectory} ports app-wide.
 * Global so any feature module can inject them without importing this module, and
 * kept outside `src/modules/` so the boundaries rules don't treat it as a foreign
 * module.
 *
 * Both adapters answer from the plan model, asking billing over the QueryBus — so
 * the gated modules never import billing, and billing never imports them. They are
 * the same seam from two ends: `Entitlements` asks what one user may do,
 * `PlanDirectory` asks who is on a plan.
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
        // The role picks the free plan, so changing it changes the answer too.
        InvalidateEntitlementsOnUserRoleChanged,
        { provide: Entitlements, useClass: PlanAwareEntitlements },
        { provide: PlanDirectory, useClass: PlanAwarePlanDirectory },
    ],
    exports: [Entitlements, PlanDirectory],
})
export class EntitlementsModule {}
