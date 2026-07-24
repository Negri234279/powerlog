import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'

import { AiGenerationAggregate, type AiGenerationRequest } from '../../domain/entities/ai-generation.entity'
import { AiGenerationQueueUnavailableError } from '../../domain/errors/ai-generation.errors'
import { AiGenerationRepository } from '../../domain/repositories/ai-generation.repository'
import { GenerationKindVO, type GenerationKindValue } from '../../domain/value-objects/generation-kind.vo'
import { AiGenerationMetrics } from '../ports/ai-generation-metrics.port'
import { AiGenerationQueue } from '../ports/ai-generation-queue.port'
import { Clock } from '../ports/clock.port'
import { IdGenerator } from '../ports/id-generator.port'
import { type AiGenerationView, toAiGenerationView } from '../views/ai-generation.view'

/**
 * Turns "the athlete asked for this" into a job someone else will run. Every
 * generate/refine mutation ends here, having done its own fail-fast checks
 * first: this service owns only what all four share — the in-flight rule, the
 * row, and handing the id to the queue.
 */
@Injectable()
export class AiGenerationQueueing {
    constructor(
        private readonly generations: AiGenerationRepository,
        private readonly queue: AiGenerationQueue,
        private readonly metrics: AiGenerationMetrics,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(AiGenerationQueueing.name)
    }

    async enqueue(userId: string, kind: GenerationKindValue, request: AiGenerationRequest): Promise<AiGenerationView> {
        const generation = AiGenerationAggregate.queue({
            id: this.ids.uuid(),
            userId,
            kind: GenerationKindVO.create(kind),
            request,
            now: this.clock.now(),
        })

        // Already being generated? Hand back the job in flight rather than a
        // second one. A double click, or a client retrying a mutation it believed
        // had failed, then waits for the answer it is already paying for.
        const inFlight = await this.generations.findUnsettledByScope(generation.scopeKey)
        if (inFlight) {
            this.logger.debug({ kind, generationId: inFlight.id }, 'generation already in flight — reusing it')

            return toAiGenerationView(inFlight)
        }

        await this.generations.save(generation)

        try {
            await this.queue.enqueue(generation.id)
        } catch (error) {
            // Nothing will ever pick it up, so it must not sit there `queued`
            // forever holding its scope against the next attempt.
            generation.fail('AI_GENERATION_QUEUE_UNAVAILABLE', this.clock.now())
            await this.generations.save(generation)
            this.logger.error({ err: error, kind, generationId: generation.id }, 'could not queue an AI generation')

            throw new AiGenerationQueueUnavailableError()
        }

        this.metrics.recordQueued(kind)
        this.logger.info({ kind, generationId: generation.id }, 'AI generation queued')

        return toAiGenerationView(generation)
    }
}
