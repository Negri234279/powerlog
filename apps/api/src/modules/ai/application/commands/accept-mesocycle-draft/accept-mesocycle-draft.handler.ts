import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { AiMesocycleDraftNotFoundError } from '../../../domain/errors/ai-mesocycle.errors'
import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { Clock } from '../../ports/clock.port'
import { type AiMesocycleDraftView, toAiMesocycleDraftView } from '../../views/ai-mesocycle-draft.view'
import { AcceptMesocycleDraftCommand } from './accept-mesocycle-draft.command'

/**
 * The athlete took the proposal. Unlike a session plan, nothing is written to the
 * workouts module here: the client seeds the mesocycle builder with the returned
 * week, replicates it across the block's weeks, and creates the mesocycle through
 * the ordinary `createMesocycle` mutation once they are happy with it.
 *
 * All this does is resolve the draft, which frees the athlete's one open slot.
 * Abandoning the builder afterwards leaves no mesocycle behind — only the record
 * of what the model suggested.
 */
@CommandHandler(AcceptMesocycleDraftCommand)
export class AcceptMesocycleDraftHandler implements ICommandHandler<AcceptMesocycleDraftCommand, AiMesocycleDraftView> {
    constructor(
        private readonly drafts: AiMesocycleDraftRepository,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(AcceptMesocycleDraftHandler.name)
    }

    async execute(command: AcceptMesocycleDraftCommand): Promise<AiMesocycleDraftView> {
        const draft = await this.drafts.findById(command.draftId)
        if (!draft || draft.userId !== command.userId) throw new AiMesocycleDraftNotFoundError()

        draft.accept(this.clock.now())
        await this.drafts.save(draft)

        this.logger.info({ weeks: draft.weeks, days: draft.proposal.days.length }, 'mesocycle draft accepted')

        return toAiMesocycleDraftView(draft)
    }
}
