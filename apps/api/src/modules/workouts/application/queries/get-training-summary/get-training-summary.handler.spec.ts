import { describe, expect, it } from 'vitest'

import { StubTrainingDashboardReadModel } from '../../../../../../tests/doubles/workouts'
import { GetTrainingSummaryHandler } from './get-training-summary.handler'
import { GetTrainingSummaryQuery } from './get-training-summary.query'

describe('GetTrainingSummaryHandler', () => {
    it('forwards the user scope and parsed range', async () => {
        const stub = new StubTrainingDashboardReadModel()
        const handler = new GetTrainingSummaryHandler(stub)

        await handler.execute(
            new GetTrainingSummaryQuery('u-1', '2026-01-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z'),
        )

        expect(stub.lastSummaryFilter).toEqual({
            userId: 'u-1',
            from: new Date('2026-01-01T00:00:00.000Z'),
            to: new Date('2026-06-01T00:00:00.000Z'),
        })
    })

    it('sums the three competition lifts into the estimated total', async () => {
        const stub = new StubTrainingDashboardReadModel({
            summary: { bestSquatE1rmKg: 200, bestBenchE1rmKg: 140, bestDeadliftE1rmKg: 240 },
        })
        const handler = new GetTrainingSummaryHandler(stub)

        const view = await handler.execute(new GetTrainingSummaryQuery('u-1'))

        expect(view.estimatedTotalKg).toBe(580)
    })

    it('totals the trained lifts even when some are missing', async () => {
        const stub = new StubTrainingDashboardReadModel({
            summary: { bestSquatE1rmKg: 200, bestBenchE1rmKg: null, bestDeadliftE1rmKg: 240 },
        })
        const handler = new GetTrainingSummaryHandler(stub)

        const view = await handler.execute(new GetTrainingSummaryQuery('u-1'))

        expect(view.estimatedTotalKg).toBe(440)
    })

    it('returns a null total when no competition lift is trained', async () => {
        const stub = new StubTrainingDashboardReadModel()
        const handler = new GetTrainingSummaryHandler(stub)

        const view = await handler.execute(new GetTrainingSummaryQuery('u-1'))

        expect(view.estimatedTotalKg).toBeNull()
    })
})
