import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { PlanNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanOfferRepository } from '../../../domain/repositories/plan-offer.repository'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { Clock } from '../../ports/clock.port'
import { GatewayProvider } from '../../ports/gateway-provider.port'
import { SyncPlanCommand } from './sync-plan.command'

/**
 * Publishes a plan to a gateway and stores the ids it hands back — the step that
 * turns a row in our catalog into something a card can actually be charged for.
 *
 * An **admin action, never a migration**: it calls an external API, so it needs
 * keys and it can fail. Re-running it is the retry, and it is safe: a plan already
 * published keeps its product, and a price already published keeps its id (prices
 * are immutable on both sides, so nothing anyone is paying can be rewritten).
 */
@CommandHandler(SyncPlanCommand)
export class SyncPlanHandler implements ICommandHandler<SyncPlanCommand, void> {
    constructor(
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
        private readonly offers: PlanOfferRepository,
        private readonly gateways: GatewayProvider,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(SyncPlanHandler.name)
    }

    async execute(command: SyncPlanCommand): Promise<void> {
        const plan = await this.plans.findById(command.planId)
        if (!plan) throw new PlanNotFoundError()

        // Asking for a gateway this environment has no keys for (or one that does
        // not exist yet — PayPal until 9.4) lands on GATEWAY_NOT_CONFIGURED here,
        // which is why the `syncedToStripe` calls below are only ever reached for
        // Stripe. PayPal will bring its own id columns.
        const gateway = this.gateways.get(command.gateway)
        // Only what is on sale is published: a withdrawn price must not reappear on
        // the provider's side.
        const prices = (await this.prices.findByPlans([plan.id])).filter((price) => price.active)
        const offer = await this.offers.findActiveByPlan(plan.id)

        const result = await gateway.syncPlan(plan, prices, offer)
        const now = this.clock.now()

        plan.syncedToStripe(result.productId, now)
        await this.plans.save(plan)

        for (const price of prices) {
            const externalId = result.priceIds[price.id]
            if (!externalId || price.stripePriceId === externalId) continue

            price.syncedToStripe(externalId, now)
            await this.prices.save(price)
        }

        if (offer && result.offerDiscountId && offer.stripeCouponId !== result.offerDiscountId) {
            offer.syncedToStripe(result.offerDiscountId, now)
            await this.offers.save(offer)
        }

        this.logger.info(
            { plan: plan.slug, gateway: command.gateway, prices: prices.length, offer: offer?.id ?? null },
            'plan published to gateway',
        )
    }
}
