import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { InvoiceStatus } from '../../../domain/entities/invoice.entity'
import type { IntroPhase } from '../../../domain/entities/plan-offer.entity'
import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import type { Currency, PlanInterval } from '../../../domain/plan-interval'
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository'
import { PlanOfferRepository } from '../../../domain/repositories/plan-offer.repository'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import type { SubscriptionStatus } from '../../../domain/subscription-status'
import { BillingConfig } from '../../ports/billing-config.port'
import { Clock } from '../../ports/clock.port'
import { GatewayProvider } from '../../ports/gateway-provider.port'
import { AvailablePlansQuery, BillingPortalUrlQuery, MyInvoicesQuery, MySubscriptionQuery } from './my-billing.queries'

export interface PublicPriceView {
    id: string
    interval: PlanInterval
    currency: Currency
    amountCents: number
    /** Which gateways can actually sell this price right now. */
    gateways: PaymentGateway[]
}

export interface PublicOfferView {
    id: string
    name: string
    trialDays: number | null
    introPhase: IntroPhase | null
    endsAt: Date | null
}

export interface PublicPlanView {
    id: string
    slug: string
    name: string
    description: string | null
    isFree: boolean
    sortOrder: number
    templates: boolean
    mesocycles: boolean
    ai: boolean
    planSessions: boolean
    maxAthletes: number | null
    prices: PublicPriceView[]
    offer: PublicOfferView | null
}

export interface MySubscriptionView {
    id: string
    planSlug: string
    planName: string
    gateway: PaymentGateway
    status: SubscriptionStatus
    amountCents: number | null
    currency: Currency | null
    interval: PlanInterval | null
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    /** The plan they drop to at renewal (a downgrade they asked for). */
    pendingPlanSlug: string | null
}

export interface MyInvoiceView {
    id: string
    number: string | null
    status: InvoiceStatus
    amountPaidCents: number
    amountDueCents: number
    currency: Currency
    hostedUrl: string | null
    pdfUrl: string | null
    issuedAt: Date
}

/**
 * The catalog as a buyer sees it: only what is on sale, with the price versions
 * that are current and the gateways that can actually take the money **in this
 * environment**. A price no gateway can sell is still shown (so the pricing page
 * is honest about what exists) but the checkout button has nothing to point at.
 */
@QueryHandler(AvailablePlansQuery)
export class AvailablePlansHandler implements IQueryHandler<AvailablePlansQuery, PublicPlanView[]> {
    constructor(
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
        private readonly offers: PlanOfferRepository,
        private readonly gateways: GatewayProvider,
        private readonly clock: Clock,
    ) {}

    async execute(query: AvailablePlansQuery): Promise<PublicPlanView[]> {
        const plans = (await this.plans.findAll(query.audience)).filter((plan) => plan.status === 'active')
        const planIds = plans.map((plan) => plan.id)
        const prices = (await this.prices.findByPlans(planIds)).filter((price) => price.active)
        const offers = await this.offers.findActiveByPlans(planIds)
        const now = this.clock.now()

        // Which providers this deployment can charge with at all.
        const configured = this.gateways.available().map((gateway) => gateway.name)

        return plans.map((plan) => {
            const snapshot = plan.entitlements.toSnapshot(plan.slug)
            const offer = offers.find((candidate) => candidate.planId === plan.id && candidate.isRedeemableAt(now))

            return {
                id: plan.id,
                slug: plan.slug,
                name: plan.name,
                description: plan.description,
                isFree: plan.isFree,
                sortOrder: plan.sortOrder,
                templates: snapshot.templates,
                mesocycles: snapshot.mesocycles,
                ai: snapshot.ai,
                planSessions: snapshot.planSessions,
                maxAthletes: snapshot.maxAthletes,
                prices: prices
                    .filter((price) => price.planId === plan.id)
                    .map((price) => ({
                        id: price.id,
                        interval: price.interval,
                        currency: price.currency,
                        amountCents: price.amountCents,
                        // A price the gateway has never heard of cannot be bought, however
                        // configured the gateway is.
                        gateways: price.stripePriceId ? configured.filter((name) => name === 'stripe') : [],
                    })),
                offer: offer
                    ? {
                          id: offer.id,
                          name: offer.name,
                          trialDays: offer.trialDays,
                          introPhase: offer.introPhase,
                          endsAt: offer.endsAt,
                      }
                    : null,
            }
        })
    }
}

@QueryHandler(MySubscriptionQuery)
export class MySubscriptionHandler implements IQueryHandler<MySubscriptionQuery, MySubscriptionView | null> {
    constructor(
        private readonly subscriptions: SubscriptionRepository,
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
        private readonly clock: Clock,
    ) {}

    async execute(query: MySubscriptionQuery): Promise<MySubscriptionView | null> {
        const subscription = await this.subscriptions.findLiveByUser(query.userId)
        // A subscription that no longer grants anything is history, not "yours": the
        // page shows the free plan instead.
        if (!subscription?.isEntitledAt(this.clock.now())) return null

        const plan = await this.plans.findById(subscription.planId)
        const price = subscription.planPriceId ? await this.prices.findById(subscription.planPriceId) : null
        const pending = subscription.pendingPlanPriceId
            ? await this.prices.findById(subscription.pendingPlanPriceId)
            : null
        const pendingPlan = pending ? await this.plans.findById(pending.planId) : null

        return {
            id: subscription.id,
            planSlug: plan?.slug ?? 'unknown',
            planName: plan?.name ?? 'Unknown',
            gateway: subscription.gateway,
            status: subscription.status,
            amountCents: price?.amountCents ?? null,
            currency: price?.currency ?? null,
            interval: price?.interval ?? null,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            pendingPlanSlug: pendingPlan?.slug ?? null,
        }
    }
}

@QueryHandler(MyInvoicesQuery)
export class MyInvoicesHandler implements IQueryHandler<MyInvoicesQuery, { rows: MyInvoiceView[]; total: number }> {
    constructor(private readonly invoices: InvoiceRepository) {}

    async execute(query: MyInvoicesQuery): Promise<{ rows: MyInvoiceView[]; total: number }> {
        const page = await this.invoices.listByUser(query.userId, query.limit, query.offset)

        return {
            rows: page.rows.map((invoice) => ({
                id: invoice.id,
                number: invoice.number,
                status: invoice.status,
                amountPaidCents: invoice.amountPaidCents,
                amountDueCents: invoice.amountDueCents,
                currency: invoice.currency,
                hostedUrl: invoice.hostedUrl,
                pdfUrl: invoice.pdfUrl,
                issuedAt: invoice.issuedAt,
            })),
            total: page.total,
        }
    }
}

/**
 * The provider's own portal, where the card lives. Null — not an error — when the
 * user has no gateway subscription or the provider has no portal (PayPal): the
 * button simply does not render.
 */
@QueryHandler(BillingPortalUrlQuery)
export class BillingPortalUrlHandler implements IQueryHandler<BillingPortalUrlQuery, string | null> {
    constructor(
        private readonly subscriptions: SubscriptionRepository,
        private readonly gateways: GatewayProvider,
        private readonly config: BillingConfig,
        private readonly clock: Clock,
    ) {}

    async execute(query: BillingPortalUrlQuery): Promise<string | null> {
        const subscription = await this.subscriptions.findLiveByUser(query.userId)
        if (!subscription?.isEntitledAt(this.clock.now()) || subscription.gateway === 'manual') return null

        const gateway = this.gateways.get(subscription.gateway)

        return gateway.billingPortalUrl(subscription, `${this.config.webOrigin}/account/billing`)
    }
}
