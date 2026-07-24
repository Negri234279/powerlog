import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { SessionPlanContextReader } from '../../../../../shared/contracts/session-plan-context'
import { SessionNotProgrammableError } from '../../../domain/errors/ai-plan.errors'
import { AiGenerationQueueing } from '../../services/ai-generation-queueing.service'
import { SetPrescriber } from '../../services/set-prescriber.service'
import type { AiGenerationView } from '../../views/ai-generation.view'
import { QueueSessionPlanGenerationCommand } from './queue-session-plan-generation.command'

/**
 * Queues the work and returns — the provider takes tens of seconds and nothing
 * that slow survives inside an HTTP request.
 *
 * What it does synchronously is everything that can say "no" cheaply: an
 * unprogrammable session, a plan without AI, a missing provider key. The athlete
 * learns about those now, in the mutation, instead of a minute later through a
 * failed job. The worker re-checks all of it — this is a courtesy, not the
 * authority ({@link GenerateSessionPlanDraftHandler} remains that).
 */
@CommandHandler(QueueSessionPlanGenerationCommand)
export class QueueSessionPlanGenerationHandler implements ICommandHandler<
    QueueSessionPlanGenerationCommand,
    AiGenerationView
> {
    constructor(
        private readonly context: SessionPlanContextReader,
        private readonly prescriber: SetPrescriber,
        private readonly entitlements: Entitlements,
        private readonly queueing: AiGenerationQueueing,
    ) {}

    async execute(command: QueueSessionPlanGenerationCommand): Promise<AiGenerationView> {
        // The context first: it is also the authorization (a session that isn't
        // yours to manage reads as null) and it says WHOSE session this is — which
        // decides the plan that pays for the AI below.
        const context = await this.context.read(command.userId, command.sessionId, command.entryId ?? undefined)
        if (!context || context.exercises.length === 0) throw new SessionNotProgrammableError()

        const audience = context.ownerId === command.userId ? 'athlete' : 'coach'
        await this.entitlements.assertFeature(command.userId, audience, 'ai')

        // A missing key must fail here rather than a minute into a job.
        await this.prescriber.resolveConfig(command.userId)

        return this.queueing.enqueue(command.userId, 'session_plan', {
            sessionId: command.sessionId,
            entryId: command.entryId,
            extraInfo: command.extraInfo,
        })
    }
}
