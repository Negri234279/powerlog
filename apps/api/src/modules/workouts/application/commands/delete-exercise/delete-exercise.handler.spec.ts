import { describe, expect, it } from 'vitest'

import { InMemoryExerciseRepository } from '../../../../../../tests/doubles/workouts'
import { ExerciseMother } from '../../../../../../tests/mothers/workouts'
import { ExerciseInUseError, ExerciseNotFoundError } from '../../../domain/errors/workouts.errors'
import { DeleteExerciseCommand } from './delete-exercise.command'
import { DeleteExerciseHandler } from './delete-exercise.handler'

describe('DeleteExerciseHandler', () => {
    it('deletes an unreferenced exercise', async () => {
        const repo = new InMemoryExerciseRepository([ExerciseMother.create({ id: 'ex-1' })])
        const handler = new DeleteExerciseHandler(repo)

        await expect(handler.execute(new DeleteExerciseCommand('ex-1'))).resolves.toBe(true)
        expect(await repo.findById('ex-1')).toBeNull()
    })

    it('refuses to delete an exercise referenced by workouts', async () => {
        const repo = new InMemoryExerciseRepository([ExerciseMother.create({ id: 'ex-1' })])
        repo.setReferences('ex-1', 3)
        const handler = new DeleteExerciseHandler(repo)

        await expect(handler.execute(new DeleteExerciseCommand('ex-1'))).rejects.toBeInstanceOf(ExerciseInUseError)
        expect(await repo.findById('ex-1')).not.toBeNull()
    })

    it('rejects an unknown exercise', async () => {
        const handler = new DeleteExerciseHandler(new InMemoryExerciseRepository())

        await expect(handler.execute(new DeleteExerciseCommand('missing'))).rejects.toBeInstanceOf(
            ExerciseNotFoundError,
        )
    })
})
