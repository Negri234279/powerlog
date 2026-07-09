import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { SessionPlanContextReader } from '../../../../../shared/contracts/session-plan-context'
import { AiPlanDraftAggregate } from '../../../domain/entities/ai-plan-draft.entity'
import { EmptySessionPlanError, SessionNotProgrammableError } from '../../../domain/errors/ai-plan.errors'
import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { SetPrescriber } from '../../services/set-prescriber.service'
import { type AiPlanDraftView, toAiPlanDraftView } from '../../views/ai-plan-draft.view'
import { GenerateSessionPlanDraftCommand } from './generate-session-plan-draft.command'

@CommandHandler(GenerateSessionPlanDraftCommand)
export class GenerateSessionPlanDraftHandler implements ICommandHandler<
    GenerateSessionPlanDraftCommand,
    AiPlanDraftView
> {
    constructor(
        private readonly drafts: AiPlanDraftRepository,
        private readonly context: SessionPlanContextReader,
        private readonly prescriber: SetPrescriber,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(GenerateSessionPlanDraftHandler.name)
    }

    async execute(command: GenerateSessionPlanDraftCommand): Promise<AiPlanDraftView> {
        // Resolve the provider first: a missing key should fail before the
        // athlete waits for anything.
        const config = await this.prescriber.resolveConfig(command.userId)

        const context = await this.context.read(command.userId, command.sessionId)
        if (!context) throw new SessionNotProgrammableError()
        if (context.exercises.every((exercise) => exercise.sets.length === 0)) throw new EmptySessionPlanError()

        const parsed = await this.prescriber.prescribe(config, context)
        const now = this.clock.now()

        // A session holds one proposal at a time; the old one is superseded.
        const previous = await this.drafts.findOpenBySession(command.userId, command.sessionId)
        if (previous) {
            previous.discard(now)
            await this.drafts.save(previous)
        }

        const draft = AiPlanDraftAggregate.create({
            id: this.ids.uuid(),
            userId: command.userId,
            sessionId: command.sessionId,
            provider: config.provider,
            model: config.model as string,
            sets: parsed.sets,
            rationale: parsed.rationale,
            rationaleId: this.ids.uuid(),
            now,
        })

        await this.drafts.save(draft)
        this.logger.info(
            { sessionId: command.sessionId, provider: config.provider.value, sets: parsed.sets.length },
            'session plan drafted',
        )

        return toAiPlanDraftView(draft)
    }
}
