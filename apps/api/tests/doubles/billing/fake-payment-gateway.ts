import { type GatewayEvent, reviveGatewayEvent } from '../../../src/modules/billing/application/ports/gateway-event'
import { GatewayProvider } from '../../../src/modules/billing/application/ports/gateway-provider.port'
import {
    type CheckoutRequest,
    PaymentGatewayPort,
    type PlanChangeMode,
    type PlanSyncResult,
} from '../../../src/modules/billing/application/ports/payment-gateway.port'
import type { PlanOfferEntity } from '../../../src/modules/billing/domain/entities/plan-offer.entity'
import type { PlanPriceEntity } from '../../../src/modules/billing/domain/entities/plan-price.entity'
import type { PlanAggregate } from '../../../src/modules/billing/domain/entities/plan.entity'
import type {
    PaymentGateway,
    SubscriptionAggregate,
} from '../../../src/modules/billing/domain/entities/subscription.entity'
import { GatewayNotConfiguredError } from '../../../src/modules/billing/domain/errors/billing.errors'

/** What the fake was asked to do, in order — tests assert on the effect, not on this. */
export interface GatewayCall {
    operation: 'sync' | 'checkout' | 'cancel' | 'resume' | 'change_plan' | 'portal'
    subscriptionId?: string
    priceId?: string
    mode?: PlanChangeMode
}

/**
 * A payment gateway that answers deterministically and never leaves the process.
 * Ids are derived from the local ones (`px_<priceId>`), so a test can assert what
 * was published without inventing a fixture.
 *
 * Set `configured = false` to model an environment with no keys — the mode dev
 * and CI actually run in.
 */
export class FakePaymentGateway extends PaymentGatewayPort {
    readonly name: PaymentGateway = 'stripe'
    readonly calls: GatewayCall[] = []

    private configured = true
    private failure: Error | null = null
    private resumeSupported = true
    private approvalUrl: string | null = null

    /** Model a provider whose cancellation is terminal (PayPal). */
    withoutResume(): this {
        this.resumeSupported = false

        return this
    }

    /** Model a provider that makes the user approve a plan change (PayPal). */
    needsApprovalToChangePlan(url = 'https://gateway.test/approve'): this {
        this.approvalUrl = url

        return this
    }

    unconfigured(): this {
        this.configured = false

        return this
    }

    /** Make the next calls fail, the way a provider outage would. */
    failsWith(error: Error): this {
        this.failure = error

        return this
    }

    isConfigured(): boolean {
        return this.configured
    }

    get supportsResume(): boolean {
        return this.resumeSupported
    }

    async syncPlan(
        plan: PlanAggregate,
        prices: PlanPriceEntity[],
        offer?: PlanOfferEntity | null,
    ): Promise<PlanSyncResult> {
        this.guard()
        this.calls.push({ operation: 'sync' })

        return {
            productId: plan.productIdOn(this.name) ?? `prod_${plan.slug}`,
            priceIds: Object.fromEntries(
                prices.map((price) => [price.id, price.externalIdOn(this.name) ?? `px_${price.id}`]),
            ),
            offer: offer?.introPhase ? { discountId: offer.stripeCouponId ?? `cpn_${offer.id}` } : null,
        }
    }

    async createCheckout(request: CheckoutRequest): Promise<string> {
        this.guard()
        this.calls.push({ operation: 'checkout', priceId: request.price.id })

        return `https://gateway.test/checkout/${request.price.id}`
    }

    async cancelAtPeriodEnd(subscription: SubscriptionAggregate): Promise<void> {
        this.guard()
        this.calls.push({ operation: 'cancel', subscriptionId: subscription.id })
    }

    async resume(subscription: SubscriptionAggregate): Promise<void> {
        this.guard()
        this.calls.push({ operation: 'resume', subscriptionId: subscription.id })
    }

    async changePlan(
        subscription: SubscriptionAggregate,
        newPrice: PlanPriceEntity,
        mode: PlanChangeMode,
    ): Promise<string | null> {
        this.guard()
        this.calls.push({ operation: 'change_plan', subscriptionId: subscription.id, priceId: newPrice.id, mode })

        return this.approvalUrl
    }

    async billingPortalUrl(subscription: SubscriptionAggregate): Promise<string | null> {
        this.guard()
        this.calls.push({ operation: 'portal', subscriptionId: subscription.id })

        return subscription.gatewayCustomerId ? `https://gateway.test/portal/${subscription.gatewayCustomerId}` : null
    }

    /**
     * The fake "signature" is the JSON body itself: a test builds the event it wants
     * to deliver and passes it as the raw body. Verifying a real signature is the
     * StripeGateway's job, and the e2e signs a payload for real with the test secret.
     *
     * It revives the dates for the same reason the journal does: JSON has no `Date`,
     * and a double that hands the pipeline strings where the real adapter hands it
     * dates is testing a system that does not exist.
     */
    async verifyWebhook(rawBody: Buffer): Promise<GatewayEvent> {
        this.guard()

        return reviveGatewayEvent(JSON.parse(rawBody.toString('utf8')))
    }

    /** What the fake provider claims is live. Tests set it to model drift. */
    private liveIds: string[] | null = []

    liveAtGateway(ids: string[] | null): this {
        this.liveIds = ids

        return this
    }

    async listLiveSubscriptionIds(): Promise<string[] | null> {
        this.guard()

        return this.liveIds
    }

    private guard(): void {
        if (!this.configured) throw new GatewayNotConfiguredError(this.name)
        if (this.failure) throw this.failure
    }
}

/** A GatewayProvider serving one fake. */
export class FakeGatewayProvider extends GatewayProvider {
    constructor(private readonly gateway: FakePaymentGateway = new FakePaymentGateway()) {
        super()
    }

    available(): PaymentGatewayPort[] {
        return this.gateway.isConfigured() ? [this.gateway] : []
    }

    get(name: PaymentGateway): PaymentGatewayPort {
        if (name !== this.gateway.name || !this.gateway.isConfigured()) throw new GatewayNotConfiguredError(name)

        return this.gateway
    }
}
