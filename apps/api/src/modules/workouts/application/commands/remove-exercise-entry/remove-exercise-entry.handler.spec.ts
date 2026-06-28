import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { RemoveExerciseEntryCommand } from './remove-exercise-entry.command'
import { RemoveExerciseEntryHandler } from './remove-exercise-entry.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

describe('RemoveExerciseEntryHandler', () => {
    it('removes an exercise entry and reindexes the rest', async () => {
        const session = WorkoutSessionMother.empty({ id: 's-1', userId: 'u-1' })
        session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
        session.addEntry({ id: 'e-2', exerciseId: 'x-2' }, NOW)
        const sessions = new InMemoryWorkoutSessionRepository([session])
        const handler = new RemoveExerciseEntryHandler(sessions, new FakeClock(NOW))

        const view = await handler.execute(new RemoveExerciseEntryCommand('u-1', 's-1', 'e-1'))

        expect(view.entries).toHaveLength(1)
        expect(view.entries[0]).toMatchObject({ id: 'e-2', order: 1 })
    })
})
