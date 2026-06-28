import { describe, expect, it } from 'vitest'

import { InMemoryExerciseRepository } from '../../../../../../tests/doubles/workouts'
import { ExerciseMother } from '../../../../../../tests/mothers/workouts'
import { ExerciseNotFoundError } from '../../../domain/errors/workouts.errors'
import { UpdateExerciseCommand } from './update-exercise.command'
import { UpdateExerciseHandler } from './update-exercise.handler'

describe('UpdateExerciseHandler', () => {
    it('edits the exercise and persists the change (slug untouched)', async () => {
        const repo = new InMemoryExerciseRepository([
            ExerciseMother.create({ id: 'ex-1', slug: 'back-squat', name: 'Back Squat' }),
        ])
        const handler = new UpdateExerciseHandler(repo)

        const view = await handler.execute(
            new UpdateExerciseCommand('ex-1', { name: 'High-Bar Squat', primaryMuscle: 'glutes' }),
        )

        expect(view).toMatchObject({ slug: 'back-squat', name: 'High-Bar Squat', primaryMuscle: 'glutes' })
        expect((await repo.findById('ex-1'))?.name).toBe('High-Bar Squat')
    })

    it('rejects an unknown exercise', async () => {
        const handler = new UpdateExerciseHandler(new InMemoryExerciseRepository())

        await expect(handler.execute(new UpdateExerciseCommand('missing', { name: 'X' }))).rejects.toBeInstanceOf(
            ExerciseNotFoundError,
        )
    })
})
