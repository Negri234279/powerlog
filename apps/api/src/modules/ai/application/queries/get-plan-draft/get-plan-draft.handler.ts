import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { type AiPlanDraftView, toAiPlanDraftView } from '../../views/ai-plan-draft.view'
import { GetPlanDraftQuery } from './get-plan-draft.query'

@QueryHandler(GetPlanDraftQuery)
export class GetPlanDraftHandler implements IQueryHandler<GetPlanDraftQuery, AiPlanDraftView | null> {
    constructor(private readonly drafts: AiPlanDraftRepository) {}

    async execute(query: GetPlanDraftQuery): Promise<AiPlanDraftView | null> {
        const draft = await this.drafts.findById(query.draftId)
        // Null rather than an error, for two reasons. Someone else's draft must be
        // indistinguishable from a missing one — whether it exists is not the
        // caller's business. And the history's detail screen holds an id without
        // knowing its kind, so it asks both by-id queries at once and keeps
        // whichever answers; "not this kind" is an ordinary answer, not a failure.
        if (!draft || draft.userId !== query.userId) return null

        return toAiPlanDraftView(draft)
    }
}
