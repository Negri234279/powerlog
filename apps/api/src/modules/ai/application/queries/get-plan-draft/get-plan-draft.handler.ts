import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { AiPlanDraftNotFoundError } from '../../../domain/errors/ai-plan.errors'
import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { type AiPlanDraftView, toAiPlanDraftView } from '../../views/ai-plan-draft.view'
import { GetPlanDraftQuery } from './get-plan-draft.query'

@QueryHandler(GetPlanDraftQuery)
export class GetPlanDraftHandler implements IQueryHandler<GetPlanDraftQuery, AiPlanDraftView> {
    constructor(private readonly drafts: AiPlanDraftRepository) {}

    async execute(query: GetPlanDraftQuery): Promise<AiPlanDraftView> {
        const draft = await this.drafts.findById(query.draftId)
        // Someone else's draft is reported as missing: whether it exists is not
        // the caller's business.
        if (!draft || draft.userId !== query.userId) throw new AiPlanDraftNotFoundError()

        return toAiPlanDraftView(draft)
    }
}
