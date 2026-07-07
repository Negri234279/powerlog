import { describe, expect, it } from 'vitest'

import { FakeIdGenerator, InMemoryExerciseRepository } from '../../../../../../tests/doubles/workouts'
import { ExerciseMother } from '../../../../../../tests/mothers/workouts'
import { ExerciseSlugTakenError } from '../../../domain/errors/workouts.errors'
import { CreateExerciseCommand } from './create-exercise.command'
import { CreateExerciseHandler } from './create-exercise.handler'

function setup(seed = [] as ReturnType<typeof ExerciseMother.create>[]) {
    const repo = new InMemoryExerciseRepository(seed)
    const handler = new CreateExerciseHandler(repo, new FakeIdGenerator(['ex-new']))
    return { repo, handler }
}

describe('CreateExerciseHandler', () => {
    it('creates an exercise, deriving the slug from the name, and persists it', async () => {
        const { repo, handler } = setup()

        const view = await handler.execute(
            new CreateExerciseCommand('Romanian Deadlift', 'deadlift', 'barbell', 'hamstrings'),
        )

        expect(view).toMatchObject({ id: 'ex-new', slug: 'romanian-deadlift', name: 'Romanian Deadlift' })
        expect(await repo.findBySlug('romanian-deadlift')).not.toBeNull()
    })

    it('honours an explicit slug', async () => {
        const { handler } = setup()

        const view = await handler.execute(
            new CreateExerciseCommand('Romanian Deadlift', 'deadlift', 'barbell', 'hamstrings', 'rdl'),
        )

        expect(view.slug).toBe('rdl')
    })

    it('rejects a slug already in the catalog', async () => {
        const { handler } = setup([ExerciseMother.create({ slug: 'back-squat' })])

        await expect(
            handler.execute(new CreateExerciseCommand('Back Squat', 'squat', 'barbell', 'quads')),
        ).rejects.toBeInstanceOf(ExerciseSlugTakenError)
    })

    it('seeds the Spanish translation when a name is given', async () => {
        const { repo, handler } = setup()

        await handler.execute(
            new CreateExerciseCommand('Romanian Deadlift', 'deadlift', 'barbell', 'hamstrings', null, 'Peso Muerto Rumano'),
        )

        expect(await repo.translationsFor(['ex-new'], 'es')).toEqual(new Map([['ex-new', 'Peso Muerto Rumano']]))
    })

    it('leaves the exercise English-only when no Spanish name is given', async () => {
        const { repo, handler } = setup()

        await handler.execute(new CreateExerciseCommand('Romanian Deadlift', 'deadlift', 'barbell', 'hamstrings'))

        expect(await repo.translationsFor(['ex-new'], 'es')).toEqual(new Map())
    })
})
