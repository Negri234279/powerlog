import { describe, expect, it } from 'vitest'

import { StubTrainingDashboardReadModel } from '../../../../../../tests/doubles/workouts'
import { GetStrengthProgressionHandler } from './get-strength-progression.handler'
import { GetStrengthProgressionQuery } from './get-strength-progression.query'

describe('GetStrengthProgressionHandler', () => {
    it('forwards user, exercise and parsed range to the read model', async () => {
        const stub = new StubTrainingDashboardReadModel()
        const handler = new GetStrengthProgressionHandler(stub)

        await handler.execute(new GetStrengthProgressionQuery('u-1', 'ex-7', '2026-01-01T00:00:00.000Z'))

        expect(stub.lastStrengthFilter).toEqual({
            userId: 'u-1',
            exerciseId: 'ex-7',
            from: new Date('2026-01-01T00:00:00.000Z'),
            to: undefined,
        })
    })

    it('returns no trend with fewer than two points', async () => {
        const stub = new StubTrainingDashboardReadModel({
            strength: [{ performedAt: new Date('2026-01-01T00:00:00.000Z'), e1rmKg: 100 }],
        })
        const handler = new GetStrengthProgressionHandler(stub)

        const view = await handler.execute(new GetStrengthProgressionQuery('u-1', 'ex-7'))

        expect(view.points).toHaveLength(1)
        expect(view.trend).toBeNull()
    })

    it('fits a weekly slope and projects 4/8/12 weeks from the last point', async () => {
        const stub = new StubTrainingDashboardReadModel({
            strength: [
                { performedAt: new Date('2026-01-01T00:00:00.000Z'), e1rmKg: 100 },
                { performedAt: new Date('2026-01-08T00:00:00.000Z'), e1rmKg: 105 },
                { performedAt: new Date('2026-01-15T00:00:00.000Z'), e1rmKg: 110 },
            ],
        })
        const handler = new GetStrengthProgressionHandler(stub)

        const view = await handler.execute(new GetStrengthProgressionQuery('u-1', 'ex-7'))

        expect(view.trend).not.toBeNull()
        expect(view.trend!.slopePerWeekKg).toBeCloseTo(5)
        expect(view.trend!.r2).toBe(1)
        // Last point is at week 2; +4/+8/+12 → weeks 6/10/14 → 130/150/170.
        expect(view.trend!.projections).toEqual([
            { weeks: 4, e1rmKg: 130 },
            { weeks: 8, e1rmKg: 150 },
            { weeks: 12, e1rmKg: 170 },
        ])
    })
})
