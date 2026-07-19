import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { GetUserTrainingQuery } from '../../../../../shared/contracts/get-user-training.query'
import type { UserTrainingSummary } from '../../../../../shared/contracts/user-training'
import { UserTrainingReadModel } from '../../ports/user-training.read-model'

/** A user's training figures for the admin detail — delegated to the read model. */
@QueryHandler(GetUserTrainingQuery)
export class GetUserTrainingHandler implements IQueryHandler<GetUserTrainingQuery, UserTrainingSummary> {
    constructor(private readonly readModel: UserTrainingReadModel) {}

    async execute(query: GetUserTrainingQuery): Promise<UserTrainingSummary> {
        return this.readModel.read(query.userId)
    }
}
