import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { MesocycleAssignedIntegrationEvent } from '../../../../../shared/integration-events/mesocycle-assigned.integration-event'
import { MesocycleAggregate } from '../../../domain/entities/mesocycle.entity'
import { NotLinkedToAthleteError } from '../../../domain/errors/workouts.errors'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { buildMesocycleContent } from '../../mesocycle-content'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { type MesocycleView, toMesocycleView } from '../../queries/get-mesocycle/get-mesocycle.handler'
import { CreateMesocycleCommand } from './create-mesocycle.command'

@CommandHandler(CreateMesocycleCommand)
export class CreateMesocycleHandler implements ICommandHandler<CreateMesocycleCommand, MesocycleView> {
    constructor(
        private readonly mesocycles: MesocycleRepository,
        private readonly exercises: ExerciseRepository,
        private readonly coachLinks: CoachLinks,
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: CreateMesocycleCommand): Promise<MesocycleView> {
        const { athleteId } = command
        if (athleteId !== undefined && !(await this.coachLinks.areLinked(command.userId, athleteId))) {
            throw new NotLinkedToAthleteError()
        }

        // Two different paths share this command, each paid by the doer's plan:
        // a coach building a block for an athlete (`plan_sessions`, a feature), and
        // a user building one for themselves (capped by `maxMesocycles`).
        if (athleteId !== undefined) {
            await this.entitlements.assertFeature(command.userId, 'plan_sessions')
        } else {
            const owned = await this.mesocycles.countSelfCreatedBy(command.userId)
            await this.entitlements.assertWithinLimit(command.userId, 'mesocycles', owned)
        }

        const content = await buildMesocycleContent(command.content, this.exercises)
        const mesocycle = MesocycleAggregate.create({
            id: this.ids.uuid(),
            // Planning for an athlete: they own the block, the coach edits it.
            ownerId: athleteId ?? command.userId,
            plannedByUserId: athleteId !== undefined ? command.userId : null,
            content,
            idFactory: () => this.ids.uuid(),
            now: this.clock.now(),
        })

        await this.mesocycles.save(mesocycle)

        if (athleteId !== undefined) {
            this.eventBus.publish(
                new MesocycleAssignedIntegrationEvent(command.userId, athleteId, mesocycle.id, mesocycle.name.value),
            )
        }

        // A freshly created mesocycle has no generated weeks yet.
        return toMesocycleView(mesocycle, [])
    }
}
