import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { PlanCatalogChangedIntegrationEvent } from '../../../../../shared/integration-events/plan-catalog-changed.integration-event'
import { FreePlanExistsError, LastFreePlanError, PlanNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { Clock } from '../../ports/clock.port'
import { SetPlanStatusCommand } from './set-plan-status.command'

/**
 * Publishes, unpublishes or archives a plan.
 *
 * Archiving is not deleting: the subscriptions already on the plan keep reading
 * it until they end — only new signups stop. What is refused is leaving an
 * audience with **no active free plan**, because that is where every user without
 * a subscription lands; without it, the app could not answer "what may this user
 * do" for most of its users.
 */
@CommandHandler(SetPlanStatusCommand)
export class SetPlanStatusHandler implements ICommandHandler<SetPlanStatusCommand, void> {
    constructor(
        private readonly plans: PlanRepository,
        private readonly clock: Clock,
        private readonly eventBus: EventBus,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(SetPlanStatusHandler.name)
    }

    async execute(command: SetPlanStatusCommand): Promise<void> {
        const plan = await this.plans.findById(command.planId)
        if (!plan) throw new PlanNotFoundError()
        if (plan.status === command.status) return

        if (plan.isFree) {
            const activeFree = await this.plans.findActiveFree(plan.audience)

            // Taking the audience's only free plan out of service.
            if (command.status !== 'active' && activeFree?.id === plan.id) {
                throw new LastFreePlanError(plan.audience)
            }

            // Publishing a second free plan for the audience (Postgres would refuse
            // it too — this just says so in a language the admin panel can show).
            if (command.status === 'active' && activeFree && activeFree.id !== plan.id) {
                throw new FreePlanExistsError(plan.audience)
            }
        }

        plan.setStatus(command.status, this.clock.now())
        await this.plans.save(plan)

        // Archiving the free plan of an audience changes what every user without a
        // subscription falls back to.
        this.eventBus.publish(new PlanCatalogChangedIntegrationEvent(plan.id, plan.slug))

        this.logger.info({ plan: plan.slug, status: command.status }, 'plan status changed')
    }
}
