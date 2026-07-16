import { describe, expect, it } from 'vitest'

import { FakeClock, FakeSetMetrics, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { ConflictingIntensityError, WorkoutSessionNotFoundError } from '../../../domain/errors/workouts.errors'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { RpeVO } from '../../../domain/value-objects/rpe.vo'
import { WeightVO } from '../../../domain/value-objects/weight.vo'
import { CompleteSetCommand } from './complete-set.command'
import { CompleteSetHandler } from './complete-set.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

/** A session holding one set programmed at 100 kg × 5 @ RPE 8. */
function setup(options: { plannedBy?: string } = {}) {
    const session = WorkoutSessionMother.empty({ id: 's-1', userId: 'u-1', plannedByUserId: options.plannedBy })
    const entry = session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
    session.addSet(
        entry.id,
        {
            id: 'set-1',
            plannedWeight: WeightVO.create(100),
            plannedReps: RepsVO.create(5),
            plannedRpe: RpeVO.create(8),
        },
        NOW,
    )

    const sessions = new InMemoryWorkoutSessionRepository([session])
    const metrics = new FakeSetMetrics()
    const coachLinks = new FakeCoachLinks()
    if (options.plannedBy) coachLinks.link(options.plannedBy, 'u-1')
    const handler = new CompleteSetHandler(sessions, coachLinks, new FakeClock(NOW), metrics)

    return { handler, metrics }
}

describe('CompleteSetHandler', () => {
    it('marks a set done, converting lb to kg and deriving e1RM', async () => {
        const { handler } = setup()

        const view = await handler.execute(
            new CompleteSetCommand('u-1', 's-1', 'e-1', 'set-1', 'success', {
                unit: 'lb',
                weight: 225,
                reps: 5,
                rpe: 8,
            }),
        )

        const set = view.entries[0]!.sets[0]!
        expect(set.outcome).toBe('success')
        expect(set.weightKg).toBe(102.06)
        expect(set.e1rmKg).toBeCloseTo(119.07, 2)
    })

    it('keeps the prescription the athlete deviated from', async () => {
        const { handler } = setup()

        // Told 100×5 @8, managed 95.
        const view = await handler.execute(
            new CompleteSetCommand('u-1', 's-1', 'e-1', 'set-1', 'failed', { weight: 95, reps: 5, rpe: 9.5 }),
        )

        const set = view.entries[0]!.sets[0]!
        expect(set).toMatchObject({ outcome: 'failed', weightKg: 95, rpe: 9.5 })
        expect(set).toMatchObject({ plannedWeightKg: 100, plannedReps: 5, plannedRpe: 8 })
    })

    it('counts the outcome', async () => {
        const { handler, metrics } = setup()

        await handler.execute(new CompleteSetCommand('u-1', 's-1', 'e-1', 'set-1', 'failed', {}))

        expect(metrics.completed).toEqual(['failed'])
    })

    it('lets the coach who planned the session mark it for their athlete', async () => {
        const { handler } = setup({ plannedBy: 'coach-1' })

        const view = await handler.execute(
            new CompleteSetCommand('coach-1', 's-1', 'e-1', 'set-1', 'success', { weight: 100, reps: 5 }),
        )

        expect(view.entries[0]!.sets[0]!.outcome).toBe('success')
    })

    it('rejects a stranger, leaving the set pending', async () => {
        const { handler, metrics } = setup()

        await expect(
            handler.execute(new CompleteSetCommand('stranger', 's-1', 'e-1', 'set-1', 'success', {})),
        ).rejects.toThrow(WorkoutSessionNotFoundError)
        expect(metrics.completed).toEqual([])
    })

    it('rejects a performance carrying both RPE and RIR', async () => {
        const { handler } = setup()

        await expect(
            handler.execute(
                new CompleteSetCommand('u-1', 's-1', 'e-1', 'set-1', 'success', {
                    weight: 100,
                    reps: 5,
                    rpe: 8,
                    rir: 2,
                }),
            ),
        ).rejects.toThrow(ConflictingIntensityError)
    })
})
