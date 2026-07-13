import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter, Histogram } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import {
    BillingMetrics,
    type CallStatus,
    type CheckoutStatus,
    type GatewayOperation,
    type SubscriptionEvent,
    type WebhookStatus,
} from '../../application/ports/billing-metrics.port'
import type { PaymentGateway } from '../../domain/entities/subscription.entity'

/** Prometheus-backed BillingMetrics adapter. Metrics declared in observability/metrics. */
@Injectable()
export class PrometheusBillingMetrics extends BillingMetrics {
    constructor(
        @InjectMetric(METRIC.gatewayRequestDuration) private readonly gatewayDuration: Histogram<string>,
        @InjectMetric(METRIC.planSync) private readonly planSync: Counter<string>,
        @InjectMetric(METRIC.checkoutSessions) private readonly checkouts: Counter<string>,
        @InjectMetric(METRIC.subscriptionEvents) private readonly subscriptionEvents: Counter<string>,
        @InjectMetric(METRIC.offerRedemptions) private readonly offers: Counter<string>,
        @InjectMetric(METRIC.billingWebhooks) private readonly webhooks: Counter<string>,
    ) {
        super()
    }

    recordGatewayCall(gateway: PaymentGateway, operation: GatewayOperation, status: CallStatus, seconds: number): void {
        this.gatewayDuration.observe({ gateway, operation, status }, seconds)
    }

    recordPlanSync(gateway: PaymentGateway, status: CallStatus): void {
        this.planSync.inc({ gateway, status })
    }

    recordCheckout(gateway: PaymentGateway, plan: string, status: CheckoutStatus): void {
        this.checkouts.inc({ gateway, plan, status })
    }

    recordSubscriptionEvent(event: SubscriptionEvent, gateway: PaymentGateway): void {
        this.subscriptionEvents.inc({ type: event, gateway })
    }

    recordOfferRedemption(plan: string): void {
        this.offers.inc({ plan })
    }

    recordWebhook(gateway: PaymentGateway, type: string, status: WebhookStatus): void {
        this.webhooks.inc({ gateway, type, status })
    }
}
