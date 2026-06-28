import { describe, expect, it } from 'vitest'

import { StubExerciseStatsReadModel } from '../../../../../../tests/doubles/workouts'
import { GetExerciseStatsHandler } from './get-exercise-stats.handler'
import { GetExerciseStatsQuery } from './get-exercise-stats.query'

describe('GetExerciseStatsHandler', () => {
    it('forwards the user scope and parses the ISO range to dates', async () => {
        const stub = new StubExerciseStatsReadModel([])
        const handler = new GetExerciseStatsHandler(stub)

        await handler.execute(new GetExerciseStatsQuery('u-1', '2026-01-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z'))

        expect(stub.lastFilter).toEqual({
            userId: 'u-1',
            from: new Date('2026-01-01T00:00:00.000Z'),
            to: new Date('2026-06-01T00:00:00.000Z'),
        })
    })

    it('omits the range when not provided', async () => {
        const stub = new StubExerciseStatsReadModel([])
        const handler = new GetExerciseStatsHandler(stub)

        await handler.execute(new GetExerciseStatsQuery('u-1'))

        expect(stub.lastFilter).toEqual({ userId: 'u-1', from: undefined, to: undefined })
    })
})
