import {
    BillingMetrics,
    type CallStatus,
    type CheckoutStatus,
    type GatewayOperation,
    type SubscriptionEvent,
    type WebhookRetryOutcome,
    type WebhookStatus,
} from '../../../src/modules/billing/application/ports/billing-metrics.port'
import type { PaymentGateway } from '../../../src/modules/billing/domain/entities/subscription.entity'

/** Recording BillingMetrics double. Metrics are a side effect, so tests rarely assert on it. */
export class FakeBillingMetrics extends BillingMetrics {
    readonly gatewayCalls: { operation: GatewayOperation; status: CallStatus }[] = []
    readonly planSyncs: CallStatus[] = []
    readonly checkouts: { plan: string; status: CheckoutStatus }[] = []
    readonly subscriptionEvents: SubscriptionEvent[] = []
    readonly offerRedemptions: string[] = []
    readonly revenues: { plan: string; currency: string; amountCents: number }[] = []
    readonly webhooks: { type: string; status: WebhookStatus }[] = []
    readonly webhookRetries: { gateway: PaymentGateway; outcome: WebhookRetryOutcome }[] = []

    recordGatewayCall(
        _gateway: PaymentGateway,
        operation: GatewayOperation,
        status: CallStatus,
        _seconds: number,
    ): void {
        this.gatewayCalls.push({ operation, status })
    }

    recordPlanSync(_gateway: PaymentGateway, status: CallStatus): void {
        this.planSyncs.push(status)
    }

    recordCheckout(_gateway: PaymentGateway, plan: string, status: CheckoutStatus): void {
        this.checkouts.push({ plan, status })
    }

    recordSubscriptionEvent(event: SubscriptionEvent): void {
        this.subscriptionEvents.push(event)
    }

    recordOfferRedemption(plan: string): void {
        this.offerRedemptions.push(plan)
    }

    recordRevenue(_gateway: PaymentGateway, plan: string, currency: string, amountCents: number): void {
        this.revenues.push({ plan, currency, amountCents })
    }

    recordWebhook(_gateway: PaymentGateway, type: string, status: WebhookStatus): void {
        this.webhooks.push({ type, status })
    }

    recordWebhookRetry(gateway: PaymentGateway, outcome: WebhookRetryOutcome): void {
        this.webhookRetries.push({ gateway, outcome })
    }
}
