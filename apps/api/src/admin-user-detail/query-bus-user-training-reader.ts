import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

import { GetUserTrainingQuery } from '../shared/contracts/get-user-training.query'
import { type UserTrainingSummary, UserTrainingReader } from '../shared/contracts/user-training'

/**
 * Bridges the auth-side {@link UserTrainingReader} port to the workouts module
 * via the QueryBus, so auth reads a user's training figures without importing
 * workouts. See `QueryBusUserBillingReader` for the shape of this seam.
 */
@Injectable()
export class QueryBusUserTrainingReader extends UserTrainingReader {
    constructor(private readonly queryBus: QueryBus) {
        super()
    }

    async read(userId: string): Promise<UserTrainingSummary> {
        return this.queryBus.execute<GetUserTrainingQuery, UserTrainingSummary>(new GetUserTrainingQuery(userId))
    }
}
