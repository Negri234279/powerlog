import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { AiMesocycleDraftNotFoundError } from '../../../domain/errors/ai-mesocycle.errors'
import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { type AiMesocycleDraftView, toAiMesocycleDraftView } from '../../views/ai-mesocycle-draft.view'
import { GetMesocycleDraftByIdQuery } from './get-mesocycle-draft-by-id.query'

@QueryHandler(GetMesocycleDraftByIdQuery)
export class GetMesocycleDraftByIdHandler implements IQueryHandler<GetMesocycleDraftByIdQuery, AiMesocycleDraftView> {
    constructor(private readonly drafts: AiMesocycleDraftRepository) {}

    async execute(query: GetMesocycleDraftByIdQuery): Promise<AiMesocycleDraftView> {
        const draft = await this.drafts.findById(query.draftId)
        // Someone else's draft is reported as missing: whether it exists is not
        // the caller's business.
        if (!draft || draft.userId !== query.userId) throw new AiMesocycleDraftNotFoundError()

        return toAiMesocycleDraftView(draft)
    }
}
