import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { SessionPlanContextReader } from '../../../../../shared/contracts/session-plan-context'
import { AiPlanDraftAggregate } from '../../../domain/entities/ai-plan-draft.entity'
import { SessionNotProgrammableError } from '../../../domain/errors/ai-plan.errors'
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
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(GenerateSessionPlanDraftHandler.name)
    }

    async execute(command: GenerateSessionPlanDraftCommand): Promise<AiPlanDraftView> {
        // The context first: it is also the authorization (a session that isn't
        // yours to manage reads as null) and it says WHOSE session this is — which
        // decides the plan that pays for the AI below.
        const context = await this.context.read(command.userId, command.sessionId, command.entryId ?? undefined)
        // No exercises means the session is empty, or the named entry is not in
        // it. Exercises *without sets* are fine — the model proposes the scheme.
        if (!context || context.exercises.length === 0) throw new SessionNotProgrammableError()

        // The plan gate before the provider: the key is the user's own (BYOK), but
        // whether they may use the feature at all is ours to say. Programming your
        // own session draws on the athlete plan; programming an athlete's session
        // draws on the coach plan.
        const audience = context.ownerId === command.userId ? 'athlete' : 'coach'
        await this.entitlements.assertFeature(command.userId, audience, 'ai')

        // Resolve the provider next: a missing key should fail before the athlete
        // waits for anything. The session runs on the session-plan-task model if the
        // user chose one, otherwise the provider default (IA.8).
        const config = await this.prescriber.resolveConfig(command.userId)
        const model = config.modelFor('session_plan') as string

        const parsed = await this.prescriber.prescribe(config, context, { extraInfo: command.extraInfo, model })
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
            entryId: command.entryId,
            provider: config.provider,
            model,
            sets: parsed.sets,
            rationale: parsed.rationale,
            rationaleId: this.ids.uuid(),
            // Kept in the thread so a later refinement — and the athlete — can see
            // what was asked for in the first place.
            ...(command.extraInfo ? { request: { id: this.ids.uuid(), content: command.extraInfo } } : {}),
            now,
        })

        await this.drafts.save(draft)
        this.logger.info(
            {
                sessionId: command.sessionId,
                provider: config.provider.value,
                sets: parsed.sets.length,
                scope: command.entryId ? 'exercise' : 'session',
            },
            'session plan drafted',
        )

        return toAiPlanDraftView(draft)
    }
}
