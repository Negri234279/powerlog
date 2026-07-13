import { Module, type Provider } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { BILLING_QUERY_HANDLERS } from './application/billing.application'
import { Clock } from './application/ports/clock.port'
import { PlanRepository } from './domain/repositories/plan.repository'
import { SubscriptionRepository } from './domain/repositories/subscription.repository'
import { DrizzlePlanRepository } from './infrastructure/persistence/repositories/drizzle-plan.repository'
import { DrizzleSubscriptionRepository } from './infrastructure/persistence/repositories/drizzle-subscription.repository'
import { SystemClock } from './infrastructure/time/system-clock'

/** Binds billing ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: PlanRepository, useClass: DrizzlePlanRepository },
    { provide: SubscriptionRepository, useClass: DrizzleSubscriptionRepository },
    { provide: Clock, useClass: SystemClock },
]

/**
 * Owns plans, subscriptions and (from 9.3) the gateways. Nothing outside this
 * module knows Stripe or PayPal exists.
 *
 * It exports no provider: the rest of the app reaches it through the QueryBus
 * (`GetUserEntitlementsQuery`, dispatched by the `Entitlements` adapter in
 * `src/entitlements/`), never by importing it.
 */
@Module({
    // AuthModule for the exported UserDirectory (the user's role picks the free
    // plan). DatabaseModule (DRIZZLE) and CqrsModule are global.
    imports: [AuthModule],
    providers: [...ADAPTERS, ...BILLING_QUERY_HANDLERS],
})
export class BillingModule {}
