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

    it('upserts the Spanish name when provided', async () => {
        const repo = new InMemoryExerciseRepository([ExerciseMother.create({ id: 'ex-1', slug: 'back-squat' })])
        const handler = new UpdateExerciseHandler(repo)

        await handler.execute(new UpdateExerciseCommand('ex-1', {}, 'Sentadilla Trasera'))

        expect(await repo.translationsFor(['ex-1'], 'es')).toEqual(new Map([['ex-1', 'Sentadilla Trasera']]))
    })

    it('clears the Spanish name when given an empty string', async () => {
        const repo = new InMemoryExerciseRepository([ExerciseMother.create({ id: 'ex-1', slug: 'back-squat' })])
        await repo.upsertTranslation('ex-1', 'es', 'Sentadilla')
        const handler = new UpdateExerciseHandler(repo)

        await handler.execute(new UpdateExerciseCommand('ex-1', {}, ''))

        expect(await repo.translationsFor(['ex-1'], 'es')).toEqual(new Map())
    })

    it('leaves the Spanish name untouched when nameEs is omitted', async () => {
        const repo = new InMemoryExerciseRepository([ExerciseMother.create({ id: 'ex-1', slug: 'back-squat' })])
        await repo.upsertTranslation('ex-1', 'es', 'Sentadilla')
        const handler = new UpdateExerciseHandler(repo)

        await handler.execute(new UpdateExerciseCommand('ex-1', { name: 'High-Bar Squat' }))

        expect(await repo.translationsFor(['ex-1'], 'es')).toEqual(new Map([['ex-1', 'Sentadilla']]))
    })
})
