import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { Clock } from '../../ports/clock.port'
import { type MesocycleView, toMesocycleView } from '../../queries/get-mesocycle/get-mesocycle.handler'
import { requireOwnedMesocycle } from '../../require-owned-mesocycle'
import { SetMesocycleStatusCommand } from './set-mesocycle-status.command'

@CommandHandler(SetMesocycleStatusCommand)
export class SetMesocycleStatusHandler implements ICommandHandler<SetMesocycleStatusCommand, MesocycleView> {
    constructor(
        private readonly mesocycles: MesocycleRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: SetMesocycleStatusCommand): Promise<MesocycleView> {
        const mesocycle = await requireOwnedMesocycle(this.mesocycles, command.mesocycleId, command.ownerId)

        mesocycle.setStatus(command.status, this.clock.now())

        await this.mesocycles.save(mesocycle)

        return toMesocycleView(mesocycle, [])
    }
}
