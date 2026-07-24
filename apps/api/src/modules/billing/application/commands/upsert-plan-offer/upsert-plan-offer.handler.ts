import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { PlanOfferEntity } from '../../../domain/entities/plan-offer.entity'
import { PlanNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanOfferRepository } from '../../../domain/repositories/plan-offer.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { UpsertPlanOfferCommand } from './upsert-plan-offer.command'

@CommandHandler(UpsertPlanOfferCommand)
export class UpsertPlanOfferHandler implements ICommandHandler<UpsertPlanOfferCommand, string> {
    constructor(
        private readonly plans: PlanRepository,
        private readonly offers: PlanOfferRepository,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(UpsertPlanOfferHandler.name)
    }

    async execute(command: UpsertPlanOfferCommand): Promise<string> {
        const plan = await this.plans.findById(command.planId)
        if (!plan) throw new PlanNotFoundError()

        const now = this.clock.now()

        // Retire the offer the plan had live. It is not edited: the discount is
        // already a coupon at the gateway, and coupons are immutable — the people
        // who signed up under the old terms keep them, which is the point.
        const previous = await this.offers.findActiveByPlan(plan.id)
        if (previous) {
            previous.deactivate(now)
            await this.offers.save(previous)
        }

        const offer = PlanOfferEntity.create({
            id: this.ids.uuid(),
            planId: plan.id,
            name: command.name,
            message: command.message,
            trialDays: command.trialDays,
            introPhase: command.introPhase,
            startsAt: command.startsAt,
            endsAt: command.endsAt,
            now,
        })
        await this.offers.save(offer)

        this.logger.info(
            {
                plan: plan.slug,
                offerId: offer.id,
                trialDays: offer.trialDays,
                introCycles: offer.introPhase?.cycles ?? null,
            },
            'plan offer published',
        )

        return offer.id
    }
}
