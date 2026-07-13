import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { MesocycleAssignedIntegrationEvent } from '../../../../../shared/integration-events/mesocycle-assigned.integration-event'
import { MesocycleAggregate } from '../../../domain/entities/mesocycle.entity'
import { NotLinkedToAthleteError } from '../../../domain/errors/workouts.errors'
import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { contentOf } from '../../mesocycle-content'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { type MesocycleView, toMesocycleView } from '../../queries/get-mesocycle/get-mesocycle.handler'
import { requireOwnedMesocycle } from '../../require-owned-mesocycle'
import { AssignMesocycleToAthleteCommand } from './assign-mesocycle-to-athlete.command'

/**
 * Gives one of the coach's own blocks to an athlete: the tree is **copied** into
 * a fresh mesocycle owned by the athlete and planned by the coach. The source
 * stays in the coach's library, so the same block can be assigned to several
 * athletes and each copy generates its own weeks independently.
 */
@CommandHandler(AssignMesocycleToAthleteCommand)
export class AssignMesocycleToAthleteHandler implements ICommandHandler<
    AssignMesocycleToAthleteCommand,
    MesocycleView
> {
    constructor(
        private readonly mesocycles: MesocycleRepository,
        private readonly coachLinks: CoachLinks,
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly eventBus: EventBus,
        private readonly logger?: PinoLogger,
    ) {
        this.logger?.setContext(AssignMesocycleToAthleteHandler.name)
    }

    async execute(command: AssignMesocycleToAthleteCommand): Promise<MesocycleView> {
        if (!(await this.coachLinks.areLinked(command.coachId, command.athleteId))) {
            throw new NotLinkedToAthleteError()
        }

        await this.entitlements.assertFeature(command.coachId, 'plan_sessions')

        const source = await requireOwnedMesocycle(this.mesocycles, command.mesocycleId, command.coachId)
        const startDate = command.startDate ? new Date(command.startDate) : undefined

        const copy = MesocycleAggregate.create({
            id: this.ids.uuid(),
            ownerId: command.athleteId,
            plannedByUserId: command.coachId,
            content: contentOf(source, startDate),
            idFactory: () => this.ids.uuid(),
            now: this.clock.now(),
        })

        await this.mesocycles.save(copy)

        this.eventBus.publish(
            new MesocycleAssignedIntegrationEvent(command.coachId, command.athleteId, copy.id, copy.name.value),
        )

        this.logger?.info(
            { mesocycleId: copy.id, sourceMesocycleId: source.id, weeks: copy.microcycles.length },
            'mesocycle assigned to athlete',
        )

        return toMesocycleView(copy, [])
    }
}
