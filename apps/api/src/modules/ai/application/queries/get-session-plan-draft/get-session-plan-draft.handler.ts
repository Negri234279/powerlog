import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { type AiPlanDraftView, toAiPlanDraftView } from '../../views/ai-plan-draft.view'
import { GetSessionPlanDraftQuery } from './get-session-plan-draft.query'

@QueryHandler(GetSessionPlanDraftQuery)
export class GetSessionPlanDraftHandler implements IQueryHandler<GetSessionPlanDraftQuery, AiPlanDraftView | null> {
    constructor(private readonly drafts: AiPlanDraftRepository) {}

    async execute(query: GetSessionPlanDraftQuery): Promise<AiPlanDraftView | null> {
        const draft = await this.drafts.findOpenBySession(query.userId, query.sessionId)

        return draft ? toAiPlanDraftView(draft) : null
    }
}
