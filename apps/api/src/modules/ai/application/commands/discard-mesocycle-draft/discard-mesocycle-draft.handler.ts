import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { AiMesocycleDraftNotFoundError } from '../../../domain/errors/ai-mesocycle.errors'
import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { Clock } from '../../ports/clock.port'
import { DiscardMesocycleDraftCommand } from './discard-mesocycle-draft.command'

@CommandHandler(DiscardMesocycleDraftCommand)
export class DiscardMesocycleDraftHandler implements ICommandHandler<DiscardMesocycleDraftCommand, boolean> {
    constructor(
        private readonly drafts: AiMesocycleDraftRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: DiscardMesocycleDraftCommand): Promise<boolean> {
        const draft = await this.drafts.findById(command.draftId)
        if (!draft || draft.userId !== command.userId) throw new AiMesocycleDraftNotFoundError()

        // The draft is kept, not deleted: the athlete may want to see what the
        // model suggested and why they said no.
        draft.discard(this.clock.now())
        await this.drafts.save(draft)

        return true
    }
}
