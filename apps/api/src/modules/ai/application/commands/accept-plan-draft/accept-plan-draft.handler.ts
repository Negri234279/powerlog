import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { SessionPlanApplier } from '../../../../../shared/contracts/session-plan-applier'
import { AiPlanDraftNotFoundError, AiPlanDraftNotOpenError } from '../../../domain/errors/ai-plan.errors'
import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { Clock } from '../../ports/clock.port'
import { type AiPlanDraftView, toAiPlanDraftView } from '../../views/ai-plan-draft.view'
import { AcceptPlanDraftCommand } from './accept-plan-draft.command'

/**
 * Hands the plan to workouts, which revalidates it and writes the targets. The
 * draft is marked accepted **after** that write succeeds: if workouts rejects it
 * — a set deleted since the draft was made, a session already trained — the
 * draft stays open and the athlete can regenerate it.
 */
@CommandHandler(AcceptPlanDraftCommand)
export class AcceptPlanDraftHandler implements ICommandHandler<AcceptPlanDraftCommand, AiPlanDraftView> {
    constructor(
        private readonly drafts: AiPlanDraftRepository,
        private readonly applier: SessionPlanApplier,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(AcceptPlanDraftHandler.name)
    }

    async execute(command: AcceptPlanDraftCommand): Promise<AiPlanDraftView> {
        const draft = await this.drafts.findById(command.draftId)
        if (!draft || draft.userId !== command.userId) throw new AiPlanDraftNotFoundError()
        // Checked before the write, not just by `accept()` below: a double-click
        // would otherwise apply the plan twice and only then be rejected.
        if (!draft.status.isOpen) throw new AiPlanDraftNotOpenError()

        await this.applier.apply({
            userId: draft.userId,
            sessionId: draft.sessionId,
            sets: draft.sets.map((set) => ({ ...set })),
        })

        draft.accept(this.clock.now())
        await this.drafts.save(draft)

        this.logger.info({ sessionId: draft.sessionId, sets: draft.sets.length }, 'session plan accepted')

        return toAiPlanDraftView(draft)
    }
}
