import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { AiPlanDraftNotFoundError, AiPlanDraftNotOpenError } from '../../../domain/errors/ai-plan.errors'
import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { AiGenerationQueueing } from '../../services/ai-generation-queueing.service'
import { SetPrescriber } from '../../services/set-prescriber.service'
import type { AiGenerationView } from '../../views/ai-generation.view'
import { QueueSessionPlanRefinementCommand } from './queue-session-plan-refinement.command'

/**
 * Queues the revision and returns. A draft that is not the caller's, is already
 * resolved, or has no provider behind it is refused here — a refinement that
 * cannot possibly land should not be queued, let alone paid for.
 *
 * The refinement is scoped to the draft, so a second one cannot start while the
 * first is still being answered; the athlete would be revising a proposal that
 * is about to be replaced.
 */
@CommandHandler(QueueSessionPlanRefinementCommand)
export class QueueSessionPlanRefinementHandler implements ICommandHandler<
    QueueSessionPlanRefinementCommand,
    AiGenerationView
> {
    constructor(
        private readonly drafts: AiPlanDraftRepository,
        private readonly prescriber: SetPrescriber,
        private readonly queueing: AiGenerationQueueing,
    ) {}

    async execute(command: QueueSessionPlanRefinementCommand): Promise<AiGenerationView> {
        const draft = await this.drafts.findById(command.draftId)
        if (!draft || draft.userId !== command.userId) throw new AiPlanDraftNotFoundError()
        if (!draft.status.isOpen) throw new AiPlanDraftNotOpenError()

        await this.prescriber.resolveConfig(command.userId)

        return this.queueing.enqueue(command.userId, 'session_plan_refinement', {
            draftId: command.draftId,
            message: command.message,
        })
    }
}
