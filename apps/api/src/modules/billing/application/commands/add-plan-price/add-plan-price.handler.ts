import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { PlanPriceEntity } from '../../../domain/entities/plan-price.entity'
import { PlanNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { AddPlanPriceCommand } from './add-plan-price.command'

/**
 * Puts a price on sale for a (plan, interval, currency) — **repricing, not
 * editing**: the version currently on sale for that combo is withdrawn and this
 * one takes its place, so the subscriptions signed on the old one keep pointing
 * at it and nobody is re-billed behind their back.
 *
 * The partial unique index enforces the same thing underneath; doing it here in
 * one step is what makes "change the price" a single admin action instead of two
 * that could be half-done.
 */
@CommandHandler(AddPlanPriceCommand)
export class AddPlanPriceHandler implements ICommandHandler<AddPlanPriceCommand, string> {
    constructor(
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(AddPlanPriceHandler.name)
    }

    async execute(command: AddPlanPriceCommand): Promise<string> {
        const plan = await this.plans.findById(command.planId)
        if (!plan) throw new PlanNotFoundError()

        const now = this.clock.now()
        const current = await this.prices.findActive(command.planId, command.interval, command.currency)
        if (current) {
            current.deactivate(now)
            await this.prices.save(current)
        }

        const price = PlanPriceEntity.create({
            id: this.ids.uuid(),
            planId: command.planId,
            interval: command.interval,
            currency: command.currency,
            amountCents: command.amountCents,
            now,
        })
        await this.prices.save(price)

        this.logger.info(
            {
                plan: plan.slug,
                interval: price.interval,
                currency: price.currency,
                amountCents: price.amountCents,
                replaced: current?.id ?? null,
            },
            'plan price published',
        )

        return price.id
    }
}
