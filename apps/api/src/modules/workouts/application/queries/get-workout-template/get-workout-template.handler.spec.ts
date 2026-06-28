import { describe, expect, it } from 'vitest'

import { WorkoutTemplateMother } from '../../../../../../tests/mothers/workouts'
import { InMemoryWorkoutTemplateRepository } from '../../../../../../tests/doubles/workouts'
import { WorkoutTemplateNotFoundError } from '../../../domain/errors/workouts.errors'
import { GetWorkoutTemplateHandler } from './get-workout-template.handler'
import { GetWorkoutTemplateQuery } from './get-workout-template.query'

const OWNER = 'u-1'

function setup(seedOwner = OWNER) {
    const template = WorkoutTemplateMother.withTree('ex-1', { id: 't-1', ownerId: seedOwner })
    const templates = new InMemoryWorkoutTemplateRepository([template])
    const handler = new GetWorkoutTemplateHandler(templates)
    return { handler }
}

describe('GetWorkoutTemplateHandler', () => {
    it('returns the full tree for the owner', async () => {
        const { handler } = setup()

        const view = await handler.execute(new GetWorkoutTemplateQuery(OWNER, 't-1'))

        expect(view).toMatchObject({ id: 't-1', ownerId: OWNER, name: 'Upper A' })
        expect(view.exercises[0]?.sets).toHaveLength(2)
    })

    it("hides another user's template as not found", async () => {
        const { handler } = setup('someone-else')

        await expect(handler.execute(new GetWorkoutTemplateQuery(OWNER, 't-1'))).rejects.toBeInstanceOf(
            WorkoutTemplateNotFoundError,
        )
    })
})
