import { Global, Module } from '@nestjs/common'

import { Entitlements } from '../shared/contracts/entitlements'
import { UnlimitedEntitlements } from './unlimited-entitlements'

/**
 * Provides the {@link Entitlements} port app-wide. Global so any feature module
 * can inject it without importing this module. Bound to the unlimited stub for
 * now; the subscription work will rebind it to a plan-aware adapter.
 */
@Global()
@Module({
    providers: [{ provide: Entitlements, useClass: UnlimitedEntitlements }],
    exports: [Entitlements],
})
export class EntitlementsModule {}
