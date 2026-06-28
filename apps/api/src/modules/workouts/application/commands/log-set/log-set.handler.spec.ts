import { describe, expect, it } from 'vitest'

import { FakeClock, FakeIdGenerator, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { ConflictingIntensityError, WorkoutSessionNotFoundError } from '../../../domain/errors/workouts.errors'
import { LogSetCommand } from './log-set.command'
import { LogSetHandler } from './log-set.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup() {
    const session = WorkoutSessionMother.empty({ id: 's-1', userId: 'u-1' })
    session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
    const sessions = new InMemoryWorkoutSessionRepository([session])
    const handler = new LogSetHandler(sessions, new FakeClock(NOW), new FakeIdGenerator(['set-1']))
    return { handler }
}

describe('LogSetHandler', () => {
    it('logs a set, converting lb to kg and deriving e1RM', async () => {
        const { handler } = setup()

        const view = await handler.execute(
            new LogSetCommand('u-1', 's-1', 'e-1', { unit: 'lb', weight: 225, reps: 5, rpe: 8 }),
        )

        const set = view.entries[0]!.sets[0]!
        expect(set.id).toBe('set-1')
        expect(set.weightKg).toBe(102.06)
        expect(set.reps).toBe(5)
        expect(set.rpe).toBe(8)
        expect(set.e1rmKg).toBeCloseTo(119.07, 2)
    })

    it('rejects a set carrying both RPE and RIR', async () => {
        const { handler } = setup()
        await expect(
            handler.execute(new LogSetCommand('u-1', 's-1', 'e-1', { weight: 100, reps: 5, rpe: 8, rir: 2 })),
        ).rejects.toThrow(ConflictingIntensityError)
    })

    it('rejects when the caller does not own the session', async () => {
        const { handler } = setup()
        await expect(
            handler.execute(new LogSetCommand('intruder', 's-1', 'e-1', { weight: 100, reps: 5 })),
        ).rejects.toThrow(WorkoutSessionNotFoundError)
    })
})
