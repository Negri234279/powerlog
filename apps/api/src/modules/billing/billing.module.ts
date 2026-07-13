import { Module, type Provider } from '@nestjs/common'

import { AdminGuard } from '../../auth/admin.guard'
import { AuthModule } from '../auth/auth.module'
import { BILLING_COMMAND_HANDLERS, BILLING_QUERY_HANDLERS } from './application/billing.application'
import { BillingConfig } from './application/ports/billing-config.port'
import { AdminBillingStatsReadModel } from './application/ports/admin-billing-stats.read-model'
import { AdminSubscriptionReadModel } from './application/ports/admin-subscription.read-model'
import { BillingMetrics } from './application/ports/billing-metrics.port'
import { Clock } from './application/ports/clock.port'
import { GatewayProvider } from './application/ports/gateway-provider.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { WebhookEventStore } from './application/ports/webhook-event.store'
import { InvoiceRepository } from './domain/repositories/invoice.repository'
import { PlanOfferRepository } from './domain/repositories/plan-offer.repository'
import { PlanPriceRepository } from './domain/repositories/plan-price.repository'
import { PlanRepository } from './domain/repositories/plan.repository'
import { SubscriptionRepository } from './domain/repositories/subscription.repository'
import { GatewayRegistry } from './infrastructure/gateways/gateway.registry'
import { PayPalGateway } from './infrastructure/gateways/paypal.gateway'
import { StripeGateway } from './infrastructure/gateways/stripe.gateway'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { ReconcileSubscriptions } from './application/services/reconcile-subscriptions.service'
import { BillingDriftProbe } from './infrastructure/metrics/billing-drift-probe'
import { BillingStateMetrics } from './infrastructure/metrics/billing-state-metrics'
import { PrometheusBillingMetrics } from './infrastructure/metrics/prometheus-billing-metrics'
import { EnvBillingConfig } from './infrastructure/config/env-billing-config'
import { DrizzleInvoiceRepository } from './infrastructure/persistence/repositories/drizzle-invoice.repository'
import { DrizzlePlanOfferRepository } from './infrastructure/persistence/repositories/drizzle-plan-offer.repository'
import { DrizzleWebhookEventStore } from './infrastructure/persistence/repositories/drizzle-webhook-event.store'
import { DrizzleAdminBillingStatsReadModel } from './infrastructure/persistence/read-models/drizzle-admin-billing-stats.read-model'
import { DrizzleAdminSubscriptionReadModel } from './infrastructure/persistence/read-models/drizzle-admin-subscription.read-model'
import { DrizzlePlanPriceRepository } from './infrastructure/persistence/repositories/drizzle-plan-price.repository'
import { DrizzlePlanRepository } from './infrastructure/persistence/repositories/drizzle-plan.repository'
import { DrizzleSubscriptionRepository } from './infrastructure/persistence/repositories/drizzle-subscription.repository'
import { SystemClock } from './infrastructure/time/system-clock'
import { BILLING_CONTROLLERS, BILLING_RESOLVERS } from './presentation/billing.presentation'

/** Binds billing ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: PlanRepository, useClass: DrizzlePlanRepository },
    { provide: PlanPriceRepository, useClass: DrizzlePlanPriceRepository },
    { provide: PlanOfferRepository, useClass: DrizzlePlanOfferRepository },
    { provide: InvoiceRepository, useClass: DrizzleInvoiceRepository },
    { provide: WebhookEventStore, useClass: DrizzleWebhookEventStore },
    { provide: BillingConfig, useClass: EnvBillingConfig },
    { provide: SubscriptionRepository, useClass: DrizzleSubscriptionRepository },
    { provide: AdminBillingStatsReadModel, useClass: DrizzleAdminBillingStatsReadModel },
    { provide: AdminSubscriptionReadModel, useClass: DrizzleAdminSubscriptionReadModel },
    { provide: BillingMetrics, useClass: PrometheusBillingMetrics },
    // The gateways. StripeGateway is a concrete provider because the registry needs
    // it by class; nothing else in the app may inject it.
    StripeGateway,
    PayPalGateway,
    { provide: GatewayProvider, useClass: GatewayRegistry },
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
    controllers: [...BILLING_CONTROLLERS],
    providers: [
        ...ADAPTERS,
        AdminGuard,
        // Instantiated for its side effect: it attaches the scrape-time `collect` to
        // the billing state gauges.
        BillingStateMetrics,
        ReconcileSubscriptions,
        // Hourly: asks each gateway what it thinks is live and publishes the
        // disagreement as `powerlog_billing_drift` — a number that should be zero.
        BillingDriftProbe,
        ...BILLING_COMMAND_HANDLERS,
        ...BILLING_QUERY_HANDLERS,
        ...BILLING_RESOLVERS,
    ],
})
export class BillingModule {}
