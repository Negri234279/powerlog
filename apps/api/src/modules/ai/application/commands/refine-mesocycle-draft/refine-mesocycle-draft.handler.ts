import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import type { LlmMessage } from '../../../../../ai/llm-provider.port'
import { MesocycleDesignContextReader } from '../../../../../shared/contracts/mesocycle-design-context'
import { AiMesocycleDraftNotFoundError } from '../../../domain/errors/ai-mesocycle.errors'
import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { MesocycleDesigner } from '../../services/mesocycle-designer.service'
import { buildMesocycleRefinePrompt } from '../../services/mesocycle-prompt.service'
import { type AiMesocycleDraftView, toAiMesocycleDraftView } from '../../views/ai-mesocycle-draft.view'
import { RefineMesocycleDraftCommand } from './refine-mesocycle-draft.command'

/**
 * A revision is a fresh week for the same block, informed by everything said so
 * far. The whole transcript is replayed to the model, and the athlete's new
 * request carries the current proposal with it — nothing was ever written, so
 * the model must be shown its own last answer.
 *
 * The block's shape is not up for revision: `trainingDays` and `weeks` come from
 * the draft, not from the message, and the aggregate rejects a week that trains
 * different days.
 */
@CommandHandler(RefineMesocycleDraftCommand)
export class RefineMesocycleDraftHandler implements ICommandHandler<RefineMesocycleDraftCommand, AiMesocycleDraftView> {
    constructor(
        private readonly drafts: AiMesocycleDraftRepository,
        private readonly context: MesocycleDesignContextReader,
        private readonly designer: MesocycleDesigner,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: RefineMesocycleDraftCommand): Promise<AiMesocycleDraftView> {
        const draft = await this.drafts.findById(command.draftId)
        if (!draft || draft.userId !== command.userId) throw new AiMesocycleDraftNotFoundError()
        // A resolved draft, or one whose thread is spent, must not cost a request.
        draft.requireRefinable()

        // The draft's own provider, and its own model below — a refinement stays on
        // the model that produced it so the cached catalog prefix survives, rather
        // than re-resolving a default the user may have changed since.
        const config = await this.designer.resolveConfigForProvider(command.userId, draft.provider.value)
        // The same trainee the draft was designed for — a refinement must not
        // silently re-anchor the block on the coach's own numbers.
        const context = await this.context.read(command.userId, draft.athleteId)

        const thread: LlmMessage[] = [
            ...draft.messages.map((message) => ({ role: message.role, content: message.content })),
            { role: 'user' as const, content: buildMesocycleRefinePrompt(command.message, draft.proposal) },
        ]
        const request = {
            weeks: draft.weeks,
            trainingDays: [...draft.trainingDays],
            goal: draft.goal,
            prompt: null,
        }

        const designed = await this.designer.design(config, context, request, { thread, model: draft.model })
        const now = this.clock.now()

        // Recorded only once the model answered: a failed call leaves no trace of
        // a request that was never acted on.
        draft.addMessage({ id: this.ids.uuid(), role: 'user', content: command.message }, now)
        draft.revise(designed.proposal, { rationaleId: this.ids.uuid(), rationale: designed.rationale }, now)

        await this.drafts.save(draft)

        return toAiMesocycleDraftView(draft)
    }
}
