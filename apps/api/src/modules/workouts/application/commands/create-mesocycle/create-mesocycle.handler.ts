import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { MesocycleAggregate } from '../../../domain/entities/mesocycle.entity'
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
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: CreateMesocycleCommand): Promise<MesocycleView> {
        const content = await buildMesocycleContent(command.content, this.exercises)
        const mesocycle = MesocycleAggregate.create({
            id: this.ids.uuid(),
            ownerId: command.ownerId,
            content,
            idFactory: () => this.ids.uuid(),
            now: this.clock.now(),
        })

        await this.mesocycles.save(mesocycle)

        // A freshly created mesocycle has no generated weeks yet.
        return toMesocycleView(mesocycle, [])
    }
}
