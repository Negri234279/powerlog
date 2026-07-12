import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { MesocycleDesignContextReader } from '../../../../../shared/contracts/mesocycle-design-context'
import { AiMesocycleDraftAggregate } from '../../../domain/entities/ai-mesocycle-draft.entity'
import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { MesocycleDesigner } from '../../services/mesocycle-designer.service'
import { type AiMesocycleDraftView, toAiMesocycleDraftView } from '../../views/ai-mesocycle-draft.view'
import { GenerateMesocycleDraftCommand } from './generate-mesocycle-draft.command'

@CommandHandler(GenerateMesocycleDraftCommand)
export class GenerateMesocycleDraftHandler implements ICommandHandler<
    GenerateMesocycleDraftCommand,
    AiMesocycleDraftView
> {
    constructor(
        private readonly drafts: AiMesocycleDraftRepository,
        private readonly context: MesocycleDesignContextReader,
        private readonly designer: MesocycleDesigner,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(GenerateMesocycleDraftHandler.name)
    }

    async execute(command: GenerateMesocycleDraftCommand): Promise<AiMesocycleDraftView> {
        // Resolve the provider first: a missing key should fail before the
        // athlete waits for anything.
        const config = await this.designer.resolveConfig(command.userId)

        // The strength that anchors the loads is the TRAINEE's — the athlete when a
        // coach is designing for them. Workouts rejects the read if they aren't linked.
        const context = await this.context.read(command.userId, command.athleteId)
        const request = {
            weeks: command.weeks,
            trainingDays: command.trainingDays,
            goal: command.goal,
            prompt: command.prompt,
        }

        const designed = await this.designer.design(config, context, request)
        const now = this.clock.now()

        // One proposal at a time per (owner, trainee): a coach designing for Ana
        // does not wipe the draft they have open for Luis.
        const previous = await this.drafts.findOpenByUser(command.userId, command.athleteId)
        if (previous) {
            previous.discard(now)
            await this.drafts.save(previous)
        }

        const draft = AiMesocycleDraftAggregate.create({
            id: this.ids.uuid(),
            userId: command.userId,
            athleteId: command.athleteId,
            provider: config.provider,
            model: config.model as string,
            weeks: command.weeks,
            trainingDays: command.trainingDays,
            goal: command.goal,
            proposal: designed.proposal,
            rationale: designed.rationale,
            rationaleId: this.ids.uuid(),
            // Kept in the thread so a later refinement — and the athlete — can see
            // what was asked for in the first place.
            ...(command.prompt ? { request: { id: this.ids.uuid(), content: command.prompt } } : {}),
            now,
        })

        await this.drafts.save(draft)
        this.logger.info(
            {
                provider: config.provider.value,
                weeks: command.weeks,
                days: designed.proposal.days.length,
                catalogSize: context.catalog.length,
                knownLifts: context.strength.length,
            },
            'mesocycle week drafted',
        )

        return toAiMesocycleDraftView(draft)
    }
}
