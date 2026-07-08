import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { Clock } from '../../ports/clock.port'
import { MesocycleMetrics } from '../../ports/mesocycle-metrics.port'
import { type MesocycleView, toMesocycleView } from '../../queries/get-mesocycle/get-mesocycle.handler'
import { requireOwnedMesocycle } from '../../require-owned-mesocycle'
import { SetMesocycleStatusCommand } from './set-mesocycle-status.command'

@CommandHandler(SetMesocycleStatusCommand)
export class SetMesocycleStatusHandler implements ICommandHandler<SetMesocycleStatusCommand, MesocycleView> {
    constructor(
        private readonly mesocycles: MesocycleRepository,
        private readonly clock: Clock,
        private readonly metrics: MesocycleMetrics,
        private readonly logger?: PinoLogger,
    ) {
        this.logger?.setContext(SetMesocycleStatusHandler.name)
    }

    async execute(command: SetMesocycleStatusCommand): Promise<MesocycleView> {
        const mesocycle = await requireOwnedMesocycle(this.mesocycles, command.mesocycleId, command.ownerId)

        const from = mesocycle.status
        mesocycle.setStatus(command.status, this.clock.now())

        await this.mesocycles.save(mesocycle)

        this.metrics.recordStatusTransition(command.status)
        this.logger?.info({ mesocycleId: mesocycle.id, from, to: command.status }, 'mesocycle status changed')

        return toMesocycleView(mesocycle, [])
    }
}
