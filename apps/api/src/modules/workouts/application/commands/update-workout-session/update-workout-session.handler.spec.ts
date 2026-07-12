import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { WorkoutSessionNotFoundError } from '../../../domain/errors/workouts.errors'
import { UpdateWorkoutSessionCommand } from './update-workout-session.command'
import { UpdateWorkoutSessionHandler } from './update-workout-session.handler'

function setup() {
    const sessions = new InMemoryWorkoutSessionRepository([
        WorkoutSessionMother.empty({ id: 's-1', userId: 'u-1', notes: 'original' }),
    ])
    return { handler: new UpdateWorkoutSessionHandler(sessions, new FakeCoachLinks(), new FakeClock()) }
}

describe('UpdateWorkoutSessionHandler', () => {
    it('updates the date and notes of an owned session', async () => {
        const { handler } = setup()
        const view = await handler.execute(
            new UpdateWorkoutSessionCommand('u-1', 's-1', '2026-02-02T12:00:00.000Z', 'leg day'),
        )
        expect(view.performedAt).toEqual(new Date('2026-02-02T12:00:00.000Z'))
        expect(view.notes).toBe('leg day')
    })

    it('leaves notes untouched when absent and clears them when null', async () => {
        const { handler } = setup()

        const left = await handler.execute(new UpdateWorkoutSessionCommand('u-1', 's-1', '2026-02-02T12:00:00.000Z'))
        expect(left.notes).toBe('original')

        const cleared = await handler.execute(new UpdateWorkoutSessionCommand('u-1', 's-1', undefined, null))
        expect(cleared.notes).toBeNull()
    })

    it('rejects when the caller does not own the session', async () => {
        const { handler } = setup()
        await expect(
            handler.execute(new UpdateWorkoutSessionCommand('intruder', 's-1', undefined, 'x')),
        ).rejects.toThrow(WorkoutSessionNotFoundError)
    })
})
