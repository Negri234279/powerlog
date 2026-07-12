import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { buildMesocycleContent } from '../../mesocycle-content'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { type MesocycleView, toMesocycleView } from '../../queries/get-mesocycle/get-mesocycle.handler'
import { requireManageableMesocycle } from '../../require-manageable-mesocycle'
import { UpdateMesocycleCommand } from './update-mesocycle.command'

@CommandHandler(UpdateMesocycleCommand)
export class UpdateMesocycleHandler implements ICommandHandler<UpdateMesocycleCommand, MesocycleView> {
    constructor(
        private readonly mesocycles: MesocycleRepository,
        private readonly exercises: ExerciseRepository,
        private readonly coachLinks: CoachLinks,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: UpdateMesocycleCommand): Promise<MesocycleView> {
        const mesocycle = await requireManageableMesocycle(
            this.mesocycles,
            this.coachLinks,
            command.mesocycleId,
            command.ownerId,
        )
        const content = await buildMesocycleContent(command.content, this.exercises)

        mesocycle.replaceContent(content, () => this.ids.uuid(), this.clock.now())

        await this.mesocycles.save(mesocycle)

        return toMesocycleView(mesocycle, [])
    }
}
