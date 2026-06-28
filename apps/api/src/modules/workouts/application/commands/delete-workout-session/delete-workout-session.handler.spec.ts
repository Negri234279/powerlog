import { describe, expect, it } from 'vitest'

import { InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { WorkoutSessionNotFoundError } from '../../../domain/errors/workouts.errors'
import { DeleteWorkoutSessionCommand } from './delete-workout-session.command'
import { DeleteWorkoutSessionHandler } from './delete-workout-session.handler'

function setup() {
    const sessions = new InMemoryWorkoutSessionRepository([WorkoutSessionMother.empty({ id: 's-1', userId: 'u-1' })])
    return { sessions, handler: new DeleteWorkoutSessionHandler(sessions) }
}

describe('DeleteWorkoutSessionHandler', () => {
    it('deletes the owned session', async () => {
        const { sessions, handler } = setup()

        await expect(handler.execute(new DeleteWorkoutSessionCommand('u-1', 's-1'))).resolves.toBe(true)
        expect(sessions.size).toBe(0)
    })

    it('rejects (and keeps the session) when the caller is not the owner', async () => {
        const { sessions, handler } = setup()

        await expect(handler.execute(new DeleteWorkoutSessionCommand('intruder', 's-1'))).rejects.toThrow(
            WorkoutSessionNotFoundError,
        )
        expect(sessions.size).toBe(1)
    })
})
