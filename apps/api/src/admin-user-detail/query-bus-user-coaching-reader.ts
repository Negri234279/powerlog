import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

import { GetUserCoachingQuery } from '../shared/contracts/get-user-coaching.query'
import { type UserCoachingSummary, UserCoachingReader } from '../shared/contracts/user-coaching'

/**
 * Bridges the auth-side {@link UserCoachingReader} port to the coaching module
 * via the QueryBus, so auth reads a user's coach/athlete links without importing
 * coaching. See `QueryBusUserBillingReader` for the shape of this seam.
 */
@Injectable()
export class QueryBusUserCoachingReader extends UserCoachingReader {
    constructor(private readonly queryBus: QueryBus) {
        super()
    }

    async read(userId: string): Promise<UserCoachingSummary> {
        return this.queryBus.execute<GetUserCoachingQuery, UserCoachingSummary>(new GetUserCoachingQuery(userId))
    }
}
