import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

import { GetSessionPlanContextQuery } from '../shared/contracts/get-session-plan-context.query'
import { type SessionPlanContext, SessionPlanContextReader } from '../shared/contracts/session-plan-context'

/** How many past sessions of each exercise the model is shown. */
const HISTORY_LIMIT = 6

/**
 * Bridges the AI-side `SessionPlanContextReader` port to the workouts module via
 * the QueryBus. Kept outside `src/modules` so dispatching the shared query never
 * crosses a module boundary, and decoupled through the bus (global via
 * `CqrsModule.forRoot`) so ai and workouts don't depend on each other. Mirrors
 * `QueryBusProfileSnapshotReader`.
 */
@Injectable()
export class QueryBusSessionPlanContextReader extends SessionPlanContextReader {
    constructor(private readonly queryBus: QueryBus) {
        super()
    }

    async read(userId: string, sessionId: string): Promise<SessionPlanContext | null> {
        const query = new GetSessionPlanContextQuery(userId, sessionId, HISTORY_LIMIT)

        return this.queryBus.execute<GetSessionPlanContextQuery, SessionPlanContext | null>(query)
    }
}
