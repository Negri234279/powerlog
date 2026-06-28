import { describe, expect, it } from 'vitest'

import { InMemoryExerciseRepository } from '../../../../../../tests/doubles/workouts'
import { ExerciseMother } from '../../../../../../tests/mothers/workouts'
import { ListExercisesHandler } from './list-exercises.handler'
import { ListExercisesQuery } from './list-exercises.query'

function setup() {
    const catalog = [
        ExerciseMother.create({ slug: 'back-squat', name: 'Back Squat', category: 'squat' }),
        ExerciseMother.create({ slug: 'bench-press', name: 'Barbell Bench Press', category: 'bench' }),
        ExerciseMother.create({ slug: 'pause-squat', name: 'Pause Squat', category: 'squat' }),
    ]
    return { handler: new ListExercisesHandler(new InMemoryExerciseRepository(catalog)) }
}

describe('ListExercisesHandler', () => {
    it('returns the whole catalog as views ordered by category (enum order) then name', async () => {
        const { handler } = setup()

        const views = await handler.execute(new ListExercisesQuery())

        // squat precedes bench in the taxonomy/enum order.
        expect(views.map((v) => v.slug)).toEqual(['back-squat', 'pause-squat', 'bench-press'])
        expect(views[0]).toMatchObject({ slug: 'back-squat', category: 'squat', equipment: 'barbell' })
    })

    it('filters by category when one is given', async () => {
        const { handler } = setup()

        const views = await handler.execute(new ListExercisesQuery('squat'))

        expect(views.map((v) => v.slug)).toEqual(['back-squat', 'pause-squat'])
        expect(views.every((v) => v.category === 'squat')).toBe(true)
    })
})
