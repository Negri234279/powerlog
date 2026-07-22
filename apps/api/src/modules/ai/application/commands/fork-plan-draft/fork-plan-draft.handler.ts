import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { SessionPlanContextReader } from '../../../../../shared/contracts/session-plan-context'
import { AiPlanDraftAggregate } from '../../../domain/entities/ai-plan-draft.entity'
import { AiPlanDraftNotFoundError, SessionNotProgrammableError } from '../../../domain/errors/ai-plan.errors'
import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { SetPrescriber } from '../../services/set-prescriber.service'
import { type AiPlanDraftView, toAiPlanDraftView } from '../../views/ai-plan-draft.view'
import { ForkPlanDraftCommand } from './fork-plan-draft.command'

/**
 * Continuing a resolved conversation. The fork is a plain open draft carrying the
 * old proposal, so every screen that already knows how to refine, accept or
 * discard a draft handles it with no special case — and no model call is made
 * until the athlete actually asks for something.
 */
@CommandHandler(ForkPlanDraftCommand)
export class ForkPlanDraftHandler implements ICommandHandler<ForkPlanDraftCommand, AiPlanDraftView> {
    constructor(
        private readonly drafts: AiPlanDraftRepository,
        private readonly context: SessionPlanContextReader,
        private readonly prescriber: SetPrescriber,
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(ForkPlanDraftHandler.name)
    }

    async execute(command: ForkPlanDraftCommand): Promise<AiPlanDraftView> {
        const source = await this.drafts.findById(command.draftId)
        if (!source || source.userId !== command.userId) throw new AiPlanDraftNotFoundError()

        // The session must still be programmable — it may have been trained or
        // deleted since. Reading it is also the authorization, and it says whose
        // session this is, which decides the plan that pays for the AI.
        const context = await this.context.read(command.userId, source.sessionId, source.entryId ?? undefined)
        if (!context || context.exercises.length === 0) throw new SessionNotProgrammableError()

        const audience = context.ownerId === command.userId ? 'athlete' : 'coach'
        await this.entitlements.assertFeature(command.userId, audience, 'ai')

        // The fork runs on the caller's provider as it is *today*, not the one that
        // answered months ago — that key may be gone.
        const config = await this.prescriber.resolveConfig(command.userId)
        const now = this.clock.now()

        // A session holds one proposal at a time; the open one is superseded, the
        // same way generating a new draft supersedes it. Nothing is lost — it stays
        // in the history, and can be picked up again from there.
        const previous = await this.drafts.findOpenBySession(command.userId, source.sessionId)
        if (previous) {
            previous.discard(now)
            await this.drafts.save(previous)
        }

        const fork = AiPlanDraftAggregate.fork({
            id: this.ids.uuid(),
            source,
            provider: config.provider,
            model: config.model as string,
            rationaleId: this.ids.uuid(),
            now,
        })

        await this.drafts.save(fork)
        this.logger.info(
            { sessionId: source.sessionId, parentDraftId: source.id, supersededOpenDraft: previous !== null },
            'plan draft forked',
        )

        return toAiPlanDraftView(fork)
    }
}
