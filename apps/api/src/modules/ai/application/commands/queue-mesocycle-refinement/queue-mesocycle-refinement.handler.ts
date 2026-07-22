import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { AiMesocycleDraftNotFoundError } from '../../../domain/errors/ai-mesocycle.errors'
import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { AiGenerationQueueing } from '../../services/ai-generation-queueing.service'
import { MesocycleDesigner } from '../../services/mesocycle-designer.service'
import type { AiGenerationView } from '../../views/ai-generation.view'
import { QueueMesocycleRefinementCommand } from './queue-mesocycle-refinement.command'

/**
 * Queues the revision and returns. A resolved draft, or one whose thread is
 * spent, is refused here — `requireRefinable` exists precisely so a dead thread
 * costs the athlete nothing, and queueing the job would defeat that.
 */
@CommandHandler(QueueMesocycleRefinementCommand)
export class QueueMesocycleRefinementHandler implements ICommandHandler<
    QueueMesocycleRefinementCommand,
    AiGenerationView
> {
    constructor(
        private readonly drafts: AiMesocycleDraftRepository,
        private readonly designer: MesocycleDesigner,
        private readonly queueing: AiGenerationQueueing,
    ) {}

    async execute(command: QueueMesocycleRefinementCommand): Promise<AiGenerationView> {
        const draft = await this.drafts.findById(command.draftId)
        if (!draft || draft.userId !== command.userId) throw new AiMesocycleDraftNotFoundError()
        draft.requireRefinable()

        await this.designer.resolveConfig(command.userId)

        return this.queueing.enqueue(command.userId, 'mesocycle_refinement', {
            draftId: command.draftId,
            message: command.message,
        })
    }
}
