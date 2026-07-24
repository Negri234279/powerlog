import { CommandBus, CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { DomainError } from '../../../../../shared/domain/domain-error'
import { AiGenerationSettledIntegrationEvent } from '../../../../../shared/integration-events/ai-generation-settled.integration-event'
import type {
    AiGenerationAggregate,
    MesocycleRequest,
    RefinementRequest,
    SessionPlanRequest,
} from '../../../domain/entities/ai-generation.entity'
import { AiGenerationNotFoundError } from '../../../domain/errors/ai-generation.errors'
import { AiGenerationRepository } from '../../../domain/repositories/ai-generation.repository'
import { AiGenerationMetrics } from '../../ports/ai-generation-metrics.port'
import { Clock } from '../../ports/clock.port'
import { GenerateMesocycleDraftCommand } from '../generate-mesocycle-draft/generate-mesocycle-draft.command'
import { GenerateSessionPlanDraftCommand } from '../generate-session-plan-draft/generate-session-plan-draft.command'
import { RefineMesocycleDraftCommand } from '../refine-mesocycle-draft/refine-mesocycle-draft.command'
import { RefinePlanDraftCommand } from '../refine-plan-draft/refine-plan-draft.command'
import { RunAiGenerationCommand } from './run-ai-generation.command'

/** Whatever the four inner commands return, this is the part needed here. */
interface DraftResult {
    id: string
}

/**
 * Owns a generation's life and nothing else: pick it up, run whichever of the
 * four jobs it names, record what happened. The jobs themselves are untouched —
 * they are the same handlers that used to run inside the mutation, and they
 * remain the authority on entitlements, context and provider.
 *
 * A failure is an *outcome*, not an exception: it is written to the row and
 * announced like a success, so the browser stops waiting and the athlete is told
 * why. Only an infrastructure failure (the row cannot be written) escapes to the
 * caller, where the queue can see it.
 */
@CommandHandler(RunAiGenerationCommand)
export class RunAiGenerationHandler implements ICommandHandler<RunAiGenerationCommand, void> {
    constructor(
        private readonly generations: AiGenerationRepository,
        private readonly commandBus: CommandBus,
        private readonly events: EventBus,
        private readonly metrics: AiGenerationMetrics,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(RunAiGenerationHandler.name)
    }

    async execute(command: RunAiGenerationCommand): Promise<void> {
        const generation = await this.generations.findById(command.generationId)
        if (!generation) throw new AiGenerationNotFoundError()

        // Not queued means someone else already has it — a duplicated job, a
        // retry after the answer was written. Dropping it here is what stops the
        // athlete's provider account from paying twice for one answer.
        if (!generation.status.isQueued) {
            this.logger.debug(
                { generationId: generation.id, status: generation.status.value },
                'generation already picked up — dropping the duplicate job',
            )

            return
        }

        generation.start(this.clock.now())
        await this.generations.save(generation)

        try {
            const draft = await this.run(generation)
            generation.succeed(draft.id, this.clock.now())
        } catch (error) {
            generation.fail(failureCodeOf(error), this.clock.now())
            this.logger.error(
                { err: error, generationId: generation.id, kind: generation.kind.value },
                'AI generation failed',
            )
        }

        await this.generations.save(generation)
        this.settle(generation)
    }

    /** Dispatch to the handler that does the actual work, by kind. */
    private run(generation: AiGenerationAggregate): Promise<DraftResult> {
        const userId = generation.userId

        switch (generation.kind.value) {
            case 'session_plan': {
                const request = generation.request as SessionPlanRequest
                const command = new GenerateSessionPlanDraftCommand(
                    userId,
                    request.sessionId,
                    request.entryId,
                    request.extraInfo,
                )

                return this.commandBus.execute(command)
            }
            case 'mesocycle': {
                const request = generation.request as MesocycleRequest
                const command = new GenerateMesocycleDraftCommand(
                    userId,
                    request.weeks,
                    request.trainingDays,
                    request.goal,
                    request.prompt,
                    request.athleteId,
                )

                return this.commandBus.execute(command)
            }
            case 'session_plan_refinement': {
                const request = generation.request as RefinementRequest
                const command = new RefinePlanDraftCommand(userId, request.draftId, request.message)

                return this.commandBus.execute(command)
            }
            case 'mesocycle_refinement': {
                const request = generation.request as RefinementRequest
                const command = new RefineMesocycleDraftCommand(userId, request.draftId, request.message)

                return this.commandBus.execute(command)
            }
        }
    }

    /**
     * Tell the browser to come and look, then record the outcome.
     *
     * That order is not cosmetic. Everything here runs *after* the result is
     * safely persisted, so all of it is a side effect — but one of those side
     * effects is the only thing that ends the athlete's wait, and the others are
     * for us. Observability failing must not cost the user their answer; it did
     * exactly that once, when a misconfigured histogram threw and took the push
     * with it.
     */
    private settle(generation: AiGenerationAggregate): void {
        const event = new AiGenerationSettledIntegrationEvent(
            generation.userId,
            generation.id,
            generation.kind.value,
            generation.status.value,
            generation.draftId,
        )
        this.events.publish(event)

        const seconds = (generation.updatedAt.getTime() - generation.createdAt.getTime()) / 1000
        this.metrics.recordSettled(generation.kind.value, generation.status.value, seconds)

        this.logger.info(
            {
                generationId: generation.id,
                kind: generation.kind.value,
                status: generation.status.value,
                seconds,
            },
            'AI generation settled',
        )
    }
}

/**
 * The stable code of what stopped it. Anything that is not a domain error is
 * `UNKNOWN` on purpose: a provider's or a driver's message is not ours to show
 * the athlete, and it would blow up the cardinality of the metric label.
 */
function failureCodeOf(error: unknown): string {
    return error instanceof DomainError ? error.code : 'UNKNOWN'
}
