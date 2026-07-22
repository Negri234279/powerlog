import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type AiDraftSummaryRow, AiDraftHistoryReadModel } from '../../ports/ai-draft-history.read-model'
import { decodeAiDraftHistoryCursor, encodeAiDraftHistoryCursor } from './ai-draft-history-cursor'
import { ListAiDraftsQuery } from './list-ai-drafts.query'

/** A page of conversation summaries plus the cursor to fetch the next one. */
export interface AiDraftHistoryPage {
    items: AiDraftSummaryRow[]
    /** Token for the following page, or null when this is the last one. */
    nextCursor: string | null
    hasNextPage: boolean
}

@QueryHandler(ListAiDraftsQuery)
export class ListAiDraftsHandler implements IQueryHandler<ListAiDraftsQuery, AiDraftHistoryPage> {
    constructor(private readonly history: AiDraftHistoryReadModel) {}

    async execute(query: ListAiDraftsQuery): Promise<AiDraftHistoryPage> {
        const { items, hasNextPage } = await this.history.list({
            userId: query.userId,
            limit: query.limit,
            kind: query.kind ?? undefined,
            status: query.status ?? undefined,
            sessionId: query.sessionId ?? undefined,
            athleteId: query.athleteId ?? undefined,
            cursor: query.cursor ? decodeAiDraftHistoryCursor(query.cursor) : undefined,
        })

        const last = items[items.length - 1]
        const nextCursor =
            hasNextPage && last ? encodeAiDraftHistoryCursor({ updatedAt: last.updatedAt, id: last.id }) : null

        return {
            items,
            nextCursor,
            hasNextPage,
        }
    }
}
