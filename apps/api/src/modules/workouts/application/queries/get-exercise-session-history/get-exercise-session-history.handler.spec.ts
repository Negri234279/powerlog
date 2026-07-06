import { describe, expect, it } from 'vitest'

import { StubExerciseSessionHistoryReadModel } from '../../../../../../tests/doubles/workouts'
import { GetExerciseSessionHistoryHandler } from './get-exercise-session-history.handler'
import { GetExerciseSessionHistoryQuery } from './get-exercise-session-history.query'

describe('GetExerciseSessionHistoryHandler', () => {
    it('forwards the user/exercise scope and the session to exclude', async () => {
        const stub = new StubExerciseSessionHistoryReadModel([])
        const handler = new GetExerciseSessionHistoryHandler(stub)

        await handler.execute(new GetExerciseSessionHistoryQuery('u-1', 'ex-1', 'sess-1', 5))

        expect(stub.lastFilter).toEqual({
            userId: 'u-1',
            exerciseId: 'ex-1',
            excludeSessionId: 'sess-1',
            limit: 5,
        })
    })

    it('defaults to 3 sessions and drops the exclusion when not given', async () => {
        const stub = new StubExerciseSessionHistoryReadModel([])
        const handler = new GetExerciseSessionHistoryHandler(stub)

        await handler.execute(new GetExerciseSessionHistoryQuery('u-1', 'ex-1'))

        expect(stub.lastFilter).toEqual({
            userId: 'u-1',
            exerciseId: 'ex-1',
            excludeSessionId: undefined,
            limit: 3,
        })
    })

    it('caps the limit so a client cannot request an unbounded page', async () => {
        const stub = new StubExerciseSessionHistoryReadModel([])
        const handler = new GetExerciseSessionHistoryHandler(stub)

        await handler.execute(new GetExerciseSessionHistoryQuery('u-1', 'ex-1', null, 1000))

        expect(stub.lastFilter?.limit).toBe(20)
    })
})
