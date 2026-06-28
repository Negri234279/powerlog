import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { StubWorkoutHistoryReadModel } from '../../../../../../tests/doubles/workouts'
import type { WorkoutSessionSummaryRow } from '../../ports/workout-history.read-model'
import { ListWorkoutSessionsHandler } from './list-workout-sessions.handler'
import { ListWorkoutSessionsQuery } from './list-workout-sessions.query'
import { decodeWorkoutHistoryCursor, encodeWorkoutHistoryCursor } from './workout-history-cursor'

function summaryRow(overrides: Partial<WorkoutSessionSummaryRow> = {}): WorkoutSessionSummaryRow {
    return {
        id: randomUUID(),
        userId: 'u-1',
        status: 'completed',
        performedAt: new Date('2026-03-01T10:00:00.000Z'),
        notes: null,
        plannedByUserId: null,
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T10:00:00.000Z'),
        exerciseCount: 2,
        setCount: 5,
        totalVolumeKg: 1000,
        ...overrides,
    }
}

describe('ListWorkoutSessionsHandler', () => {
    it('forwards the user scope, limit, status, parsed range, exercise, query and decoded cursor', async () => {
        const stub = new StubWorkoutHistoryReadModel([])
        const handler = new ListWorkoutSessionsHandler(stub)
        const cursor = encodeWorkoutHistoryCursor({ performedAt: new Date('2026-02-01T00:00:00.000Z'), id: 'c-9' })

        await handler.execute(
            new ListWorkoutSessionsQuery(
                'u-1',
                20,
                'completed',
                '2026-01-01T00:00:00.000Z',
                '2026-06-01T00:00:00.000Z',
                'ex-7',
                'leg day',
                cursor,
            ),
        )

        expect(stub.lastFilter).toEqual({
            userId: 'u-1',
            limit: 20,
            status: 'completed',
            from: new Date('2026-01-01T00:00:00.000Z'),
            to: new Date('2026-06-01T00:00:00.000Z'),
            exerciseId: 'ex-7',
            query: 'leg day',
            cursor: { performedAt: new Date('2026-02-01T00:00:00.000Z'), id: 'c-9' },
        })
    })

    it('omits range/status/exercise/query/cursor when not provided', async () => {
        const stub = new StubWorkoutHistoryReadModel([])
        const handler = new ListWorkoutSessionsHandler(stub)

        await handler.execute(new ListWorkoutSessionsQuery('u-1', 20))

        expect(stub.lastFilter).toEqual({
            userId: 'u-1',
            limit: 20,
            status: undefined,
            from: undefined,
            to: undefined,
            exerciseId: undefined,
            query: undefined,
            cursor: undefined,
        })
    })

    it('returns a nextCursor pointing at the last row when another page follows', async () => {
        const last = summaryRow({ id: 'last', performedAt: new Date('2026-02-20T00:00:00.000Z') })
        const stub = new StubWorkoutHistoryReadModel([summaryRow(), last], true)
        const handler = new ListWorkoutSessionsHandler(stub)

        const page = await handler.execute(new ListWorkoutSessionsQuery('u-1', 2))

        expect(page.hasNextPage).toBe(true)
        expect(page.nextCursor).not.toBeNull()
        expect(decodeWorkoutHistoryCursor(page.nextCursor!)).toEqual({
            performedAt: new Date('2026-02-20T00:00:00.000Z'),
            id: 'last',
        })
    })

    it('returns a null cursor on the last page', async () => {
        const stub = new StubWorkoutHistoryReadModel([summaryRow()], false)
        const handler = new ListWorkoutSessionsHandler(stub)

        const page = await handler.execute(new ListWorkoutSessionsQuery('u-1', 20))

        expect(page.hasNextPage).toBe(false)
        expect(page.nextCursor).toBeNull()
    })

    it('rejects a malformed cursor', async () => {
        const stub = new StubWorkoutHistoryReadModel([])
        const handler = new ListWorkoutSessionsHandler(stub)

        await expect(
            handler.execute(
                new ListWorkoutSessionsQuery(
                    'u-1',
                    20,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    'not-a-cursor',
                ),
            ),
        ).rejects.toMatchObject({ code: 'INVALID_WORKOUT_CURSOR' })
    })
})
