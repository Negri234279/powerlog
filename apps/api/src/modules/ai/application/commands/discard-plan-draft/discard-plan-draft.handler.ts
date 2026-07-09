import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { AiPlanDraftNotFoundError } from '../../../domain/errors/ai-plan.errors'
import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { Clock } from '../../ports/clock.port'
import { DiscardPlanDraftCommand } from './discard-plan-draft.command'

@CommandHandler(DiscardPlanDraftCommand)
export class DiscardPlanDraftHandler implements ICommandHandler<DiscardPlanDraftCommand, boolean> {
    constructor(
        private readonly drafts: AiPlanDraftRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: DiscardPlanDraftCommand): Promise<boolean> {
        const draft = await this.drafts.findById(command.draftId)
        if (!draft || draft.userId !== command.userId) throw new AiPlanDraftNotFoundError()

        // The draft is kept, not deleted: the athlete may want to see what the
        // model suggested and why they said no.
        draft.discard(this.clock.now())
        await this.drafts.save(draft)

        return true
    }
}
