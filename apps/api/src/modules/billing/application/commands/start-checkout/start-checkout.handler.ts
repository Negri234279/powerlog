import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import {
    EmbeddedCheckoutUnsupportedError,
    OfferNotRedeemableError,
    PlanNotAvailableError,
    PlanNotFoundError,
    PlanPriceNotFoundError,
    SubscriptionAlreadyActiveError,
} from '../../../domain/errors/billing.errors'
import { PlanOfferRepository } from '../../../domain/repositories/plan-offer.repository'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import { BillingConfig } from '../../ports/billing-config.port'
import { BillingMetrics } from '../../ports/billing-metrics.port'
import { Clock } from '../../ports/clock.port'
import { GatewayProvider } from '../../ports/gateway-provider.port'
import type { CheckoutSession } from '../../ports/payment-gateway.port'
import { StartCheckoutCommand } from './start-checkout.command'

/**
 * Sends the user off to pay. It creates **nothing** locally: the subscription is
 * born from the webhook, not from this call and not from the success redirect —
 * a user who pays and closes the tab must still end up subscribed, and a user who
 * types the success URL by hand must not.
 */
@CommandHandler(StartCheckoutCommand)
export class StartCheckoutHandler implements ICommandHandler<StartCheckoutCommand, CheckoutSession> {
    constructor(
        private readonly subscriptions: SubscriptionRepository,
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
        private readonly offers: PlanOfferRepository,
        private readonly gateways: GatewayProvider,
        private readonly users: UserDirectory,
        private readonly config: BillingConfig,
        private readonly metrics: BillingMetrics,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(StartCheckoutHandler.name)
    }

    async execute(command: StartCheckoutCommand): Promise<CheckoutSession> {
        // Embedded is an in-page Stripe iframe; no other gateway has one. Refuse it
        // up front rather than let the adapter hand back a redirect the web is not
        // expecting (the UI only ever offers embedded for Stripe).
        if (command.uiMode === 'embedded' && command.gateway !== 'stripe') {
            throw new EmbeddedCheckoutUnsupportedError(command.gateway)
        }

        const price = await this.prices.findById(command.planPriceId)
        if (!price || !price.active) throw new PlanPriceNotFoundError()

        const plan = await this.plans.findById(price.planId)
        if (!plan) throw new PlanNotFoundError()
        if (!plan.acceptsSignups()) throw new PlanNotAvailableError()

        // Athlete and coach plans are independent subscriptions, so the guard is
        // per audience: one live subscription per user PER AUDIENCE. Someone who
        // already pays IN THIS AUDIENCE changes plan; they do not buy a second one
        // on top — but a coach buying an athlete plan for their own training (or an
        // athlete buying a coach plan, the onboarding path that promotes them when
        // it activates) is a different audience and always allowed. No role check:
        // every audience is buyable, and coach onboarding is the webhook's job.
        const live = await this.subscriptions.findAllLiveByUser(command.userId)
        const now = this.clock.now()
        const sameAudience = live.find((subscription) => subscription.audience === plan.audience)
        if (sameAudience?.isEntitledAt(now)) throw new SubscriptionAlreadyActiveError()

        const offer = await this.resolveOffer(command.offerId, plan.id)
        const gateway = this.gateways.get(command.gateway)
        const contact = await this.users.getContact(command.userId)

        // Reuse a customer the gateway already knows for this user — from ANY of their
        // live subscriptions — so a coach paying for their second (cross-audience)
        // plan does not become a second Stripe customer with a second payment method.
        const knownCustomerId = live.find((subscription) => subscription.gatewayCustomerId)?.gatewayCustomerId ?? null

        const session = await gateway.createCheckout({
            userId: command.userId,
            uiMode: command.uiMode,
            plan,
            price,
            offer,
            customerId: knownCustomerId,
            email: contact?.email ?? '',
            // The web's account area lives under /profile. The redirect is only a
            // landing spot: the real state arrives by webhook, and the page is told to
            // refetch by the realtime event — it never trusts these query params. The
            // audience tells the plan page which side (athlete/coach tab) just paid, so
            // it waits on the right subscription and, for a coach plan, promotes.
            successUrl: `${this.config.webOrigin}/profile/plan?checkout=success&audience=${plan.audience}`,
            cancelUrl: `${this.config.webOrigin}/profile/plan?checkout=cancelled`,
        })

        this.metrics.recordCheckout(command.gateway, plan.slug, 'started')
        this.logger.info(
            { plan: plan.slug, gateway: command.gateway, uiMode: command.uiMode, offer: offer?.id ?? null },
            'checkout started',
        )

        return session
    }

    private async resolveOffer(offerId: string | null, planId: string) {
        if (!offerId) return null

        const offer = await this.offers.findById(offerId)
        // An offer that is over, not started, or belongs to another plan is not a
        // discount the user gets to keep by holding on to its id.
        if (!offer || offer.planId !== planId || !offer.isRedeemableAt(this.clock.now())) {
            throw new OfferNotRedeemableError()
        }

        return offer
    }
}
