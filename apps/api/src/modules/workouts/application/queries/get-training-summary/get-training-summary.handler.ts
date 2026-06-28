import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type TrainingSummaryRow, TrainingDashboardReadModel } from '../../ports/training-dashboard.read-model'
import { GetTrainingSummaryQuery } from './get-training-summary.query'

/** Summary row plus the derived estimated powerlifting total (S+B+D e1RM). */
export interface TrainingSummaryView extends TrainingSummaryRow {
    /** Σ of the three competition-lift e1RMs; null when none are trained. */
    estimatedTotalKg: number | null
}

@QueryHandler(GetTrainingSummaryQuery)
export class GetTrainingSummaryHandler implements IQueryHandler<GetTrainingSummaryQuery, TrainingSummaryView> {
    constructor(private readonly dashboard: TrainingDashboardReadModel) {}

    async execute(query: GetTrainingSummaryQuery): Promise<TrainingSummaryView> {
        const row = await this.dashboard.summary({
            userId: query.userId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
        })

        const lifts = [row.bestSquatE1rmKg, row.bestBenchE1rmKg, row.bestDeadliftE1rmKg]
        const trained = lifts.filter((v): v is number => v !== null)
        const estimatedTotalKg =
            trained.length === 0 ? null : Math.round(trained.reduce((sum, v) => sum + v, 0) * 100) / 100

        return {
            ...row,
            estimatedTotalKg,
        }
    }
}
