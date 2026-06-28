import { describe, expect, it } from 'vitest'

import { InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { WorkoutSessionNotFoundError } from '../../../domain/errors/workouts.errors'
import { GetWorkoutSessionHandler } from './get-workout-session.handler'
import { GetWorkoutSessionQuery } from './get-workout-session.query'

function setup() {
    const session = WorkoutSessionMother.withTree('x-1', { id: 's-1', userId: 'u-1' })
    const sessions = new InMemoryWorkoutSessionRepository([session])
    return { handler: new GetWorkoutSessionHandler(sessions) }
}

describe('GetWorkoutSessionHandler', () => {
    it('returns the owned session as a view tree', async () => {
        const { handler } = setup()

        const view = await handler.execute(new GetWorkoutSessionQuery('u-1', 's-1'))

        expect(view).toMatchObject({ id: 's-1', userId: 'u-1', status: 'completed' })
        expect(view.entries[0]!.sets).toHaveLength(2)
    })

    it('hides sessions owned by someone else', async () => {
        const { handler } = setup()
        await expect(handler.execute(new GetWorkoutSessionQuery('intruder', 's-1'))).rejects.toThrow(
            WorkoutSessionNotFoundError,
        )
    })

    it('throws for an unknown id', async () => {
        const { handler } = setup()
        await expect(handler.execute(new GetWorkoutSessionQuery('u-1', 'nope'))).rejects.toThrow(
            WorkoutSessionNotFoundError,
        )
    })
})
