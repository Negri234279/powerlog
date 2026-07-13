import { Module, type Provider } from '@nestjs/common'

import { AdminGuard } from '../../auth/admin.guard'
import { AuthModule } from '../auth/auth.module'
import { BILLING_COMMAND_HANDLERS, BILLING_QUERY_HANDLERS } from './application/billing.application'
import { AdminBillingStatsReadModel } from './application/ports/admin-billing-stats.read-model'
import { AdminSubscriptionReadModel } from './application/ports/admin-subscription.read-model'
import { Clock } from './application/ports/clock.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { PlanPriceRepository } from './domain/repositories/plan-price.repository'
import { PlanRepository } from './domain/repositories/plan.repository'
import { SubscriptionRepository } from './domain/repositories/subscription.repository'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { BillingStateMetrics } from './infrastructure/metrics/billing-state-metrics'
import { DrizzleAdminBillingStatsReadModel } from './infrastructure/persistence/read-models/drizzle-admin-billing-stats.read-model'
import { DrizzleAdminSubscriptionReadModel } from './infrastructure/persistence/read-models/drizzle-admin-subscription.read-model'
import { DrizzlePlanPriceRepository } from './infrastructure/persistence/repositories/drizzle-plan-price.repository'
import { DrizzlePlanRepository } from './infrastructure/persistence/repositories/drizzle-plan.repository'
import { DrizzleSubscriptionRepository } from './infrastructure/persistence/repositories/drizzle-subscription.repository'
import { SystemClock } from './infrastructure/time/system-clock'
import { BILLING_RESOLVERS } from './presentation/billing.presentation'

/** Binds billing ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: PlanRepository, useClass: DrizzlePlanRepository },
    { provide: PlanPriceRepository, useClass: DrizzlePlanPriceRepository },
    { provide: SubscriptionRepository, useClass: DrizzleSubscriptionRepository },
    { provide: AdminBillingStatsReadModel, useClass: DrizzleAdminBillingStatsReadModel },
    { provide: AdminSubscriptionReadModel, useClass: DrizzleAdminSubscriptionReadModel },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
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
    // AuthModule for the shared JwtCookieGuard + the exported UserDirectory (the
    // user's role picks the free plan; the admin listing resolves subscribers).
    // DatabaseModule (DRIZZLE) and CqrsModule are global.
    imports: [AuthModule],
    providers: [
        ...ADAPTERS,
        AdminGuard,
        // Instantiated for its side effect: it attaches the scrape-time `collect` to
        // the billing state gauges.
        BillingStateMetrics,
        ...BILLING_COMMAND_HANDLERS,
        ...BILLING_QUERY_HANDLERS,
        ...BILLING_RESOLVERS,
    ],
})
export class BillingModule {}
