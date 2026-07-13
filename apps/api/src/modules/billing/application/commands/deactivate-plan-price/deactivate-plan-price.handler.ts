import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { PlanPriceNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { Clock } from '../../ports/clock.port'
import { DeactivatePlanPriceCommand } from './deactivate-plan-price.command'

/**
 * Withdraws a price from sale without putting another in its place — how you stop
 * selling an interval or a currency. The subscriptions on it keep running: they
 * paid for this version and it stays theirs.
 */
@CommandHandler(DeactivatePlanPriceCommand)
export class DeactivatePlanPriceHandler implements ICommandHandler<DeactivatePlanPriceCommand, void> {
    constructor(
        private readonly prices: PlanPriceRepository,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(DeactivatePlanPriceHandler.name)
    }

    async execute(command: DeactivatePlanPriceCommand): Promise<void> {
        const price = await this.prices.findById(command.priceId)
        if (!price) throw new PlanPriceNotFoundError()
        if (!price.active) return

        price.deactivate(this.clock.now())
        await this.prices.save(price)

        this.logger.info(
            { priceId: price.id, interval: price.interval, currency: price.currency },
            'plan price withdrawn',
        )
    }
}
