import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type WorkoutSessionSummaryRow, WorkoutHistoryReadModel } from '../../ports/workout-history.read-model'
import { ListWorkoutSessionsQuery } from './list-workout-sessions.query'
import { decodeWorkoutHistoryCursor, encodeWorkoutHistoryCursor } from './workout-history-cursor'

/** A page of session summaries plus the cursor to fetch the next one. */
export interface WorkoutHistoryPage {
    items: WorkoutSessionSummaryRow[]
    /** Token for the following page, or null when this is the last one. */
    nextCursor: string | null
    hasNextPage: boolean
}

@QueryHandler(ListWorkoutSessionsQuery)
export class ListWorkoutSessionsHandler implements IQueryHandler<ListWorkoutSessionsQuery, WorkoutHistoryPage> {
    constructor(private readonly history: WorkoutHistoryReadModel) {}

    async execute(query: ListWorkoutSessionsQuery): Promise<WorkoutHistoryPage> {
        const { items, hasNextPage } = await this.history.list({
            userId: query.userId,
            limit: query.limit,
            status: query.status,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            exerciseId: query.exerciseId ?? undefined,
            query: query.query ?? undefined,
            cursor: query.cursor ? decodeWorkoutHistoryCursor(query.cursor) : undefined,
        })

        const last = items[items.length - 1]
        const nextCursor =
            hasNextPage && last ? encodeWorkoutHistoryCursor({ performedAt: last.performedAt, id: last.id }) : null

        return {
            items,
            nextCursor,
            hasNextPage,
        }
    }
}
