import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { requireManageableMesocycle } from '../../require-manageable-mesocycle'
import { DeleteMesocycleCommand } from './delete-mesocycle.command'

@CommandHandler(DeleteMesocycleCommand)
export class DeleteMesocycleHandler implements ICommandHandler<DeleteMesocycleCommand, boolean> {
    constructor(
        private readonly mesocycles: MesocycleRepository,
        private readonly coachLinks: CoachLinks,
    ) {}

    async execute(command: DeleteMesocycleCommand): Promise<boolean> {
        // Asserts the caller may manage it before deleting (cascade removes the tree).
        await requireManageableMesocycle(this.mesocycles, this.coachLinks, command.mesocycleId, command.ownerId)

        await this.mesocycles.delete(command.mesocycleId)

        return true
    }
}
