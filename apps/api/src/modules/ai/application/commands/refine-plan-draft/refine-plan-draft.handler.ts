import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import type { LlmMessage } from '../../../../../ai/llm-provider.port'
import { SessionPlanContextReader } from '../../../../../shared/contracts/session-plan-context'
import { AiPlanDraftNotFoundError, SessionNotProgrammableError } from '../../../domain/errors/ai-plan.errors'
import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { buildRefinePrompt } from '../../services/plan-prompt.service'
import { SetPrescriber } from '../../services/set-prescriber.service'
import { type AiPlanDraftView, toAiPlanDraftView } from '../../views/ai-plan-draft.view'
import { RefinePlanDraftCommand } from './refine-plan-draft.command'

/**
 * A revision is a fresh proposal for the same session, informed by everything
 * said so far. The whole transcript is replayed to the model, and the athlete's
 * new request carries the current proposal with it — the draft was never written
 * to the session, so the context alone would show the model empty targets.
 */
@CommandHandler(RefinePlanDraftCommand)
export class RefinePlanDraftHandler implements ICommandHandler<RefinePlanDraftCommand, AiPlanDraftView> {
    constructor(
        private readonly drafts: AiPlanDraftRepository,
        private readonly context: SessionPlanContextReader,
        private readonly prescriber: SetPrescriber,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: RefinePlanDraftCommand): Promise<AiPlanDraftView> {
        const draft = await this.drafts.findById(command.draftId)
        if (!draft || draft.userId !== command.userId) throw new AiPlanDraftNotFoundError()

        const config = await this.prescriber.resolveConfig(command.userId)

        const context = await this.context.read(command.userId, draft.sessionId)
        if (!context) throw new SessionNotProgrammableError()

        const thread: LlmMessage[] = [
            ...draft.messages.map((message) => ({ role: message.role, content: message.content })),
            { role: 'user' as const, content: buildRefinePrompt(command.message, draft.sets) },
        ]

        const parsed = await this.prescriber.prescribe(config, context, thread)
        const now = this.clock.now()

        // Recorded only once the model answered: a failed call leaves no trace of
        // a request that was never acted on.
        draft.addMessage({ id: this.ids.uuid(), role: 'user', content: command.message }, now)
        draft.revise(parsed.sets, { rationaleId: this.ids.uuid(), rationale: parsed.rationale }, now)

        await this.drafts.save(draft)

        return toAiPlanDraftView(draft)
    }
}
