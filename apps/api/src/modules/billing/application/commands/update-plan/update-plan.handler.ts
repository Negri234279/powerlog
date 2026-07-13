import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { PlanNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { Clock } from '../../ports/clock.port'
import { UpdatePlanCommand } from './update-plan.command'

/**
 * Edits a plan, entitlements included — **and that reaches its subscribers at
 * once**: every check reads the plan as it is now. Deliberate (adding a feature
 * to a paid plan should not need a re-subscribe), and the reason the price is the
 * thing that is versioned instead.
 */
@CommandHandler(UpdatePlanCommand)
export class UpdatePlanHandler implements ICommandHandler<UpdatePlanCommand, void> {
    constructor(
        private readonly plans: PlanRepository,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(UpdatePlanHandler.name)
    }

    async execute(command: UpdatePlanCommand): Promise<void> {
        const plan = await this.plans.findById(command.planId)
        if (!plan) throw new PlanNotFoundError()

        plan.update(command.patch, this.clock.now())
        await this.plans.save(plan)

        this.logger.info(
            { plan: plan.slug, entitlementsChanged: command.patch.entitlements !== undefined },
            'plan updated',
        )
    }
}
