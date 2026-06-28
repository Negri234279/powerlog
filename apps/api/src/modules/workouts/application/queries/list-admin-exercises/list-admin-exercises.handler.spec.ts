import { describe, expect, it } from 'vitest'

import { InMemoryExerciseRepository } from '../../../../../../tests/doubles/workouts'
import { ExerciseMother } from '../../../../../../tests/mothers/workouts'
import { ListAdminExercisesHandler } from './list-admin-exercises.handler'
import { ListAdminExercisesQuery } from './list-admin-exercises.query'

function setup() {
    const catalog = [
        ExerciseMother.create({
            slug: 'back-squat',
            name: 'Back Squat',
            category: 'squat',
            equipment: 'barbell',
            primaryMuscle: 'quads',
        }),
        ExerciseMother.create({
            slug: 'leg-press',
            name: 'Leg Press',
            category: 'legs',
            equipment: 'machine',
            primaryMuscle: 'quads',
        }),
        ExerciseMother.create({
            slug: 'db-curl',
            name: 'Dumbbell Curl',
            category: 'arms',
            equipment: 'dumbbell',
            primaryMuscle: 'biceps',
        }),
    ]
    return { handler: new ListAdminExercisesHandler(new InMemoryExerciseRepository(catalog)) }
}

describe('ListAdminExercisesHandler', () => {
    it('returns a page with the total for an empty filter', async () => {
        const { handler } = setup()

        const page = await handler.execute(new ListAdminExercisesQuery({}, 50, 0))

        expect(page.rows).toHaveLength(3)
        expect(page).toMatchObject({ total: 3, limit: 50, offset: 0 })
    })

    it('paginates with limit/offset while reporting the full total', async () => {
        const { handler } = setup()

        const first = await handler.execute(new ListAdminExercisesQuery({}, 2, 0))
        expect(first.rows).toHaveLength(2)
        expect(first.total).toBe(3)

        const second = await handler.execute(new ListAdminExercisesQuery({}, 2, 2))
        expect(second.rows).toHaveLength(1)
        expect(second.total).toBe(3)
    })

    it('filters by category, equipment and muscle (any-of)', async () => {
        const { handler } = setup()

        const byEquipment = await handler.execute(
            new ListAdminExercisesQuery({ equipment: ['machine', 'dumbbell'] }, 50, 0),
        )
        expect(byEquipment.rows.map((v) => v.slug).sort()).toEqual(['db-curl', 'leg-press'])
        expect(byEquipment.total).toBe(2)

        const byMuscle = await handler.execute(new ListAdminExercisesQuery({ muscles: ['biceps'] }, 50, 0))
        expect(byMuscle.rows.map((v) => v.slug)).toEqual(['db-curl'])
    })

    it('matches free text on name or slug', async () => {
        const { handler } = setup()

        const page = await handler.execute(new ListAdminExercisesQuery({ search: 'squat' }, 50, 0))

        expect(page.rows.map((v) => v.slug)).toEqual(['back-squat'])
        expect(page.total).toBe(1)
    })
})
