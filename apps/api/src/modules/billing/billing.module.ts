import { Module, type Provider } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { AdminGuard } from '../../auth/admin.guard'
import { BullQueueFactory } from '../../queue/bull-queue.factory'
import { AuthModule } from '../auth/auth.module'
import { BILLING_COMMAND_HANDLERS, BILLING_QUERY_HANDLERS } from './application/billing.application'
import { BillingConfig } from './application/ports/billing-config.port'
import { AdminBillingStatsReadModel } from './application/ports/admin-billing-stats.read-model'
import { AdminSubscriptionReadModel } from './application/ports/admin-subscription.read-model'
import { BillingMetrics } from './application/ports/billing-metrics.port'
import { Clock } from './application/ports/clock.port'
import { GatewayProvider } from './application/ports/gateway-provider.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { PlanMembershipReadModel } from './application/ports/plan-membership.read-model'
import { ReceiptRenderer } from './application/ports/receipt-renderer.port'
import { WebhookEventStore } from './application/ports/webhook-event.store'
import { WebhookRetryQueue } from './application/ports/webhook-retry-queue.port'
import { InvoiceRepository } from './domain/repositories/invoice.repository'
import { PlanOfferRepository } from './domain/repositories/plan-offer.repository'
import { PlanPriceRepository } from './domain/repositories/plan-price.repository'
import { PlanRepository } from './domain/repositories/plan.repository'
import { PlanTranslationRepository } from './domain/repositories/plan-translation.repository'
import { SubscriptionRepository } from './domain/repositories/subscription.repository'
import { TrialRedemptionRepository } from './domain/repositories/trial-redemption.repository'
import { GatewayRegistry } from './infrastructure/gateways/gateway.registry'
import { PayPalGateway } from './infrastructure/gateways/paypal.gateway'
import { StripeGateway } from './infrastructure/gateways/stripe.gateway'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { PdfKitReceiptRenderer } from './infrastructure/receipts/pdfkit-receipt-renderer'
import { BullWebhookRetryQueue } from './infrastructure/queue/bull-webhook-retry-queue'
import { InProcessWebhookRetryQueue } from './infrastructure/queue/in-process-webhook-retry-queue'
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
import { DrizzlePlanMembershipReadModel } from './infrastructure/persistence/read-models/drizzle-plan-membership.read-model'
import { DrizzlePlanPriceRepository } from './infrastructure/persistence/repositories/drizzle-plan-price.repository'
import { DrizzlePlanRepository } from './infrastructure/persistence/repositories/drizzle-plan.repository'
import { DrizzlePlanTranslationRepository } from './infrastructure/persistence/repositories/drizzle-plan-translation.repository'
import { DrizzleSubscriptionRepository } from './infrastructure/persistence/repositories/drizzle-subscription.repository'
import { DrizzleTrialRedemptionRepository } from './infrastructure/persistence/repositories/drizzle-trial-redemption.repository'
import { SystemClock } from './infrastructure/time/system-clock'
import { BILLING_CONTROLLERS, BILLING_RESOLVERS } from './presentation/billing.presentation'

/** Binds billing ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: PlanRepository, useClass: DrizzlePlanRepository },
    { provide: PlanTranslationRepository, useClass: DrizzlePlanTranslationRepository },
    { provide: PlanPriceRepository, useClass: DrizzlePlanPriceRepository },
    { provide: PlanOfferRepository, useClass: DrizzlePlanOfferRepository },
    { provide: InvoiceRepository, useClass: DrizzleInvoiceRepository },
    { provide: WebhookEventStore, useClass: DrizzleWebhookEventStore },
    { provide: BillingConfig, useClass: EnvBillingConfig },
    { provide: SubscriptionRepository, useClass: DrizzleSubscriptionRepository },
    { provide: TrialRedemptionRepository, useClass: DrizzleTrialRedemptionRepository },
    { provide: AdminBillingStatsReadModel, useClass: DrizzleAdminBillingStatsReadModel },
    { provide: AdminSubscriptionReadModel, useClass: DrizzleAdminSubscriptionReadModel },
    { provide: PlanMembershipReadModel, useClass: DrizzlePlanMembershipReadModel },
    { provide: BillingMetrics, useClass: PrometheusBillingMetrics },
    // The gateways. StripeGateway is a concrete provider because the registry needs
    // it by class; nothing else in the app may inject it.
    StripeGateway,
    PayPalGateway,
    { provide: GatewayProvider, useClass: GatewayRegistry },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
    { provide: ReceiptRenderer, useClass: PdfKitReceiptRenderer },
]

/** BullMQ when Redis is configured, in-process timers otherwise — see
 *  WebhookRetryQueue. The shared BullQueueFactory owns the connections and their
 *  shutdown; `available` mirrors whether Redis is set. */
const RETRY_QUEUE: Provider = {
    provide: WebhookRetryQueue,
    inject: [BullQueueFactory, CommandBus, BillingMetrics, PinoLogger],
    useFactory: (
        queues: BullQueueFactory,
        commandBus: CommandBus,
        metrics: BillingMetrics,
        logger: PinoLogger,
    ): WebhookRetryQueue =>
        queues.available
            ? new BullWebhookRetryQueue(queues, commandBus, metrics, logger)
            : new InProcessWebhookRetryQueue(commandBus, metrics, logger),
}

/**
 * Owns plans, subscriptions and (from 9.3) the gateways. Nothing outside this
 * module knows Stripe or PayPal exists.
 *
 * It exports no provider: the rest of the app reaches it through the QueryBus
 * (`GetUserEntitlementsQuery` and `GetPlanMembershipQuery`, dispatched by the
 * `Entitlements` / `PlanDirectory` adapters in `src/entitlements/`), never by
 * importing it.
 */
@Module({
    // AuthModule for the shared JwtCookieGuard + the exported UserDirectory (the
    // user's role picks the free plan; the admin listing resolves subscribers).
    // DatabaseModule (DRIZZLE) and CqrsModule are global.
    imports: [AuthModule],
    controllers: [...BILLING_CONTROLLERS],
    providers: [
        ...ADAPTERS,
        RETRY_QUEUE,
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
