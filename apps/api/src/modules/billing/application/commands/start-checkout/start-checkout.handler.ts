import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import {
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
import { StartCheckoutCommand } from './start-checkout.command'

/**
 * Sends the user off to pay. It creates **nothing** locally: the subscription is
 * born from the webhook, not from this call and not from the success redirect —
 * a user who pays and closes the tab must still end up subscribed, and a user who
 * types the success URL by hand must not.
 */
@CommandHandler(StartCheckoutCommand)
export class StartCheckoutHandler implements ICommandHandler<StartCheckoutCommand, string> {
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

    async execute(command: StartCheckoutCommand): Promise<string> {
        // One live subscription per user. Someone who already pays changes plan; they
        // do not buy a second one on top.
        const live = await this.subscriptions.findLiveByUser(command.userId)
        if (live?.isEntitledAt(this.clock.now())) throw new SubscriptionAlreadyActiveError()

        const price = await this.prices.findById(command.planPriceId)
        if (!price || !price.active) throw new PlanPriceNotFoundError()

        const plan = await this.plans.findById(price.planId)
        if (!plan) throw new PlanNotFoundError()
        if (!plan.acceptsSignups()) throw new PlanNotAvailableError()

        const offer = await this.resolveOffer(command.offerId, plan.id)
        const gateway = this.gateways.get(command.gateway)
        const contact = await this.users.getContact(command.userId)

        const url = await gateway.createCheckout({
            userId: command.userId,
            plan,
            price,
            offer,
            // Reuse the customer the gateway already knows, so a returning subscriber
            // does not end up as two customers with two payment methods.
            customerId: live?.gatewayCustomerId ?? null,
            email: contact?.email ?? '',
            // The web's account area lives under /profile. The redirect is only a
            // landing spot: the real state arrives by webhook, and the page is told to
            // refetch by the realtime event — it never trusts these query params.
            successUrl: `${this.config.webOrigin}/profile/plan?checkout=success`,
            cancelUrl: `${this.config.webOrigin}/profile/plan?checkout=cancelled`,
        })

        this.metrics.recordCheckout(command.gateway, plan.slug, 'started')
        this.logger.info({ plan: plan.slug, gateway: command.gateway, offer: offer?.id ?? null }, 'checkout started')

        return url
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
