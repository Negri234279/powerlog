import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { AiGenerationNotFoundError } from '../../../domain/errors/ai-generation.errors'
import { AiGenerationRepository } from '../../../domain/repositories/ai-generation.repository'
import { type AiGenerationView, toAiGenerationView } from '../../views/ai-generation.view'
import { GetAiGenerationQuery } from './get-ai-generation.query'

/**
 * Someone else's generation reads as missing rather than forbidden: the id alone
 * should not confirm that a job exists.
 */
@QueryHandler(GetAiGenerationQuery)
export class GetAiGenerationHandler implements IQueryHandler<GetAiGenerationQuery, AiGenerationView> {
    constructor(private readonly generations: AiGenerationRepository) {}

    async execute(query: GetAiGenerationQuery): Promise<AiGenerationView> {
        const generation = await this.generations.findById(query.generationId)
        if (!generation || generation.userId !== query.userId) throw new AiGenerationNotFoundError()

        return toAiGenerationView(generation)
    }
}
