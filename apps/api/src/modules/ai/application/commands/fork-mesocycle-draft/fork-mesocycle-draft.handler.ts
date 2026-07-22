import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { AiMesocycleDraftAggregate } from '../../../domain/entities/ai-mesocycle-draft.entity'
import { AiMesocycleDraftNotFoundError } from '../../../domain/errors/ai-mesocycle.errors'
import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { MesocycleDesigner } from '../../services/mesocycle-designer.service'
import { type AiMesocycleDraftView, toAiMesocycleDraftView } from '../../views/ai-mesocycle-draft.view'
import { ForkMesocycleDraftCommand } from './fork-mesocycle-draft.command'

/**
 * Continuing a resolved block design. The fork is a plain open draft carrying the
 * old week, so the builder and the refine flow handle it with no special case —
 * and no model call is made until the athlete actually asks for something.
 */
@CommandHandler(ForkMesocycleDraftCommand)
export class ForkMesocycleDraftHandler implements ICommandHandler<ForkMesocycleDraftCommand, AiMesocycleDraftView> {
    constructor(
        private readonly drafts: AiMesocycleDraftRepository,
        private readonly designer: MesocycleDesigner,
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(ForkMesocycleDraftHandler.name)
    }

    async execute(command: ForkMesocycleDraftCommand): Promise<AiMesocycleDraftView> {
        const source = await this.drafts.findById(command.draftId)
        if (!source || source.userId !== command.userId) throw new AiMesocycleDraftNotFoundError()

        // Same gate as designing a block from scratch: designing for an athlete
        // draws on the coach plan, for yourself on the athlete plan.
        const audience = source.athleteId ? 'coach' : 'athlete'
        await this.entitlements.assertFeature(command.userId, audience, 'ai')

        // The fork runs on the caller's provider as it is *today*, not the one that
        // answered months ago — that key may be gone.
        const config = await this.designer.resolveConfig(command.userId)
        const now = this.clock.now()

        // One proposal at a time per (owner, trainee) — the same rule generating a
        // block obeys. The superseded draft stays in the history, and can be picked
        // up again from there.
        const previous = await this.drafts.findOpenByUser(command.userId, source.athleteId)
        if (previous) {
            previous.discard(now)
            await this.drafts.save(previous)
        }

        const fork = AiMesocycleDraftAggregate.fork({
            id: this.ids.uuid(),
            source,
            provider: config.provider,
            model: config.model as string,
            rationaleId: this.ids.uuid(),
            now,
        })

        await this.drafts.save(fork)
        this.logger.info(
            { parentDraftId: source.id, weeks: source.weeks, supersededOpenDraft: previous !== null },
            'mesocycle draft forked',
        )

        return toAiMesocycleDraftView(fork)
    }
}
