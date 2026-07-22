import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { type AiMesocycleDraftView, toAiMesocycleDraftView } from '../../views/ai-mesocycle-draft.view'
import { GetMesocycleDraftByIdQuery } from './get-mesocycle-draft-by-id.query'

@QueryHandler(GetMesocycleDraftByIdQuery)
export class GetMesocycleDraftByIdHandler implements IQueryHandler<
    GetMesocycleDraftByIdQuery,
    AiMesocycleDraftView | null
> {
    constructor(private readonly drafts: AiMesocycleDraftRepository) {}

    async execute(query: GetMesocycleDraftByIdQuery): Promise<AiMesocycleDraftView | null> {
        const draft = await this.drafts.findById(query.draftId)
        // Null rather than an error — see `GetPlanDraftHandler` for why.
        if (!draft || draft.userId !== query.userId) return null

        return toAiMesocycleDraftView(draft)
    }
}
