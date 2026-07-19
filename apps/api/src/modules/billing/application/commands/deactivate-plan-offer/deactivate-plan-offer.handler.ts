import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { PlanOfferNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanOfferRepository } from '../../../domain/repositories/plan-offer.repository'
import { Clock } from '../../ports/clock.port'
import { DeactivatePlanOfferCommand } from './deactivate-plan-offer.command'

/**
 * Retire a plan's live offer without putting another in its place — how you turn a
 * trial or intro discount off. Whoever signed up under it keeps their terms (the
 * gateway coupon/plan is theirs); this only stops new signups from getting it.
 */
@CommandHandler(DeactivatePlanOfferCommand)
export class DeactivatePlanOfferHandler implements ICommandHandler<DeactivatePlanOfferCommand, void> {
    constructor(
        private readonly offers: PlanOfferRepository,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(DeactivatePlanOfferHandler.name)
    }

    async execute(command: DeactivatePlanOfferCommand): Promise<void> {
        const offer = await this.offers.findById(command.offerId)
        if (!offer) throw new PlanOfferNotFoundError()
        if (!offer.active) return

        offer.deactivate(this.clock.now())
        await this.offers.save(offer)

        this.logger.info({ offerId: offer.id, planId: offer.planId }, 'plan offer retired')
    }
}
