import { Global, Module } from '@nestjs/common'

import { Entitlements } from '../shared/contracts/entitlements'
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
    providers: [{ provide: Entitlements, useClass: PlanAwareEntitlements }],
    exports: [Entitlements],
})
export class EntitlementsModule {}
