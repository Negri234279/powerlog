import { describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeIdGenerator,
    InMemoryExerciseRepository,
    InMemoryWorkoutSessionRepository,
} from '../../../../../../tests/doubles/workouts'
import { ExerciseMother, WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { ExerciseNotFoundError, WorkoutSessionNotFoundError } from '../../../domain/errors/workouts.errors'
import { AddExerciseEntryCommand } from './add-exercise-entry.command'
import { AddExerciseEntryHandler } from './add-exercise-entry.handler'

function setup() {
    const exercises = new InMemoryExerciseRepository([ExerciseMother.create({ id: 'x-1' })])
    const sessions = new InMemoryWorkoutSessionRepository([WorkoutSessionMother.empty({ id: 's-1', userId: 'u-1' })])
    const handler = new AddExerciseEntryHandler(sessions, exercises, new FakeClock(), new FakeIdGenerator(['e-1']))
    return { handler }
}

describe('AddExerciseEntryHandler', () => {
    it('adds an exercise entry to the owned session', async () => {
        const { handler } = setup()

        const view = await handler.execute(new AddExerciseEntryCommand('u-1', 's-1', 'x-1', 'top set'))

        expect(view.entries).toHaveLength(1)
        expect(view.entries[0]).toMatchObject({ id: 'e-1', exerciseId: 'x-1', order: 1, notes: 'top set' })
    })

    it('rejects an unknown exercise', async () => {
        const { handler } = setup()
        await expect(handler.execute(new AddExerciseEntryCommand('u-1', 's-1', 'nope', null))).rejects.toThrow(
            ExerciseNotFoundError,
        )
    })

    it('rejects when the caller does not own the session', async () => {
        const { handler } = setup()
        await expect(handler.execute(new AddExerciseEntryCommand('intruder', 's-1', 'x-1', null))).rejects.toThrow(
            WorkoutSessionNotFoundError,
        )
    })

    it('lets the planning coach manage an athlete-owned planned session', async () => {
        const exercises = new InMemoryExerciseRepository([ExerciseMother.create({ id: 'x-1' })])
        const sessions = new InMemoryWorkoutSessionRepository([
            WorkoutSessionMother.empty({ id: 's-1', userId: 'athlete-1', plannedByUserId: 'coach-1' }),
        ])
        const handler = new AddExerciseEntryHandler(sessions, exercises, new FakeClock(), new FakeIdGenerator(['e-1']))

        const view = await handler.execute(new AddExerciseEntryCommand('coach-1', 's-1', 'x-1', 'planned'))

        expect(view.entries).toHaveLength(1)
    })
})
