import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { type AiMesocycleDraftView, toAiMesocycleDraftView } from '../../views/ai-mesocycle-draft.view'
import { GetMesocycleDraftQuery } from './get-mesocycle-draft.query'

@QueryHandler(GetMesocycleDraftQuery)
export class GetMesocycleDraftHandler implements IQueryHandler<GetMesocycleDraftQuery, AiMesocycleDraftView | null> {
    constructor(private readonly drafts: AiMesocycleDraftRepository) {}

    async execute(query: GetMesocycleDraftQuery): Promise<AiMesocycleDraftView | null> {
        const draft = await this.drafts.findOpenByUser(query.userId, query.athleteId)

        return draft ? toAiMesocycleDraftView(draft) : null
    }
}
