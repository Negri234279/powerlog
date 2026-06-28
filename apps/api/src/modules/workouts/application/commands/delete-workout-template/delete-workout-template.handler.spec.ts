import { describe, expect, it } from 'vitest'

import { WorkoutTemplateMother } from '../../../../../../tests/mothers/workouts'
import { InMemoryWorkoutTemplateRepository } from '../../../../../../tests/doubles/workouts'
import { WorkoutTemplateNotFoundError } from '../../../domain/errors/workouts.errors'
import { DeleteWorkoutTemplateCommand } from './delete-workout-template.command'
import { DeleteWorkoutTemplateHandler } from './delete-workout-template.handler'

const OWNER = 'u-1'

function setup(seedOwner = OWNER) {
    const template = WorkoutTemplateMother.withTree('ex-1', { id: 't-1', ownerId: seedOwner })
    const templates = new InMemoryWorkoutTemplateRepository([template])
    const handler = new DeleteWorkoutTemplateHandler(templates)
    return { templates, handler }
}

describe('DeleteWorkoutTemplateHandler', () => {
    it('deletes a template the caller owns', async () => {
        const { templates, handler } = setup()

        await expect(handler.execute(new DeleteWorkoutTemplateCommand(OWNER, 't-1'))).resolves.toBe(true)
        expect(templates.size).toBe(0)
    })

    it("rejects deleting someone else's template and leaves it intact", async () => {
        const { templates, handler } = setup('someone-else')

        await expect(handler.execute(new DeleteWorkoutTemplateCommand(OWNER, 't-1'))).rejects.toBeInstanceOf(
            WorkoutTemplateNotFoundError,
        )
        expect(templates.size).toBe(1)
    })
})
