import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { WorkoutSessionNotFoundError } from '../../../domain/errors/workouts.errors'
import { CompleteWorkoutSessionCommand } from './complete-workout-session.command'
import { CompleteWorkoutSessionHandler } from './complete-workout-session.handler'

function setup() {
    const sessions = new InMemoryWorkoutSessionRepository([WorkoutSessionMother.empty({ id: 's-1', userId: 'u-1' })])
    return { handler: new CompleteWorkoutSessionHandler(sessions, new FakeCoachLinks(), new FakeClock()) }
}

describe('CompleteWorkoutSessionHandler', () => {
    it('marks the owned session as completed', async () => {
        const { handler } = setup()
        const view = await handler.execute(new CompleteWorkoutSessionCommand('u-1', 's-1'))
        expect(view.status).toBe('completed')
    })

    it('rejects when the caller does not own the session', async () => {
        const { handler } = setup()
        await expect(handler.execute(new CompleteWorkoutSessionCommand('intruder', 's-1'))).rejects.toThrow(
            WorkoutSessionNotFoundError,
        )
    })
})
