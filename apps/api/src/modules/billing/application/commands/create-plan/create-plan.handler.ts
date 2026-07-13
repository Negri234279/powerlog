import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { PlanAggregate } from '../../../domain/entities/plan.entity'
import { FreePlanExistsError, PlanSlugTakenError } from '../../../domain/errors/billing.errors'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { CreatePlanCommand } from './create-plan.command'

@CommandHandler(CreatePlanCommand)
export class CreatePlanHandler implements ICommandHandler<CreatePlanCommand, string> {
    constructor(
        private readonly plans: PlanRepository,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(CreatePlanHandler.name)
    }

    async execute(command: CreatePlanCommand): Promise<string> {
        const slug = command.slug.trim().toLowerCase()
        if (await this.plans.findBySlug(slug)) throw new PlanSlugTakenError()

        // Postgres would refuse a second active free plan anyway (partial unique
        // index); catching it here turns a constraint violation into an error the
        // admin panel can actually show.
        if (command.isFree && command.status === 'active' && (await this.plans.findActiveFree(command.audience))) {
            throw new FreePlanExistsError(command.audience)
        }

        const plan = PlanAggregate.create({
            id: this.ids.uuid(),
            audience: command.audience,
            slug,
            name: command.name,
            description: command.description,
            status: command.status,
            isFree: command.isFree,
            sortOrder: command.sortOrder,
            entitlements: command.entitlements,
            now: this.clock.now(),
        })

        await this.plans.save(plan)
        this.logger.info({ plan: plan.slug, audience: plan.audience, status: plan.status }, 'plan created')

        return plan.id
    }
}
