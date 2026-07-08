import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { requireOwnedMesocycle } from '../../require-owned-mesocycle'
import { DeleteMesocycleCommand } from './delete-mesocycle.command'

@CommandHandler(DeleteMesocycleCommand)
export class DeleteMesocycleHandler implements ICommandHandler<DeleteMesocycleCommand, boolean> {
    constructor(private readonly mesocycles: MesocycleRepository) {}

    async execute(command: DeleteMesocycleCommand): Promise<boolean> {
        // Asserts ownership before deleting (cascade removes the whole tree).
        await requireOwnedMesocycle(this.mesocycles, command.mesocycleId, command.ownerId)

        await this.mesocycles.delete(command.mesocycleId)

        return true
    }
}
