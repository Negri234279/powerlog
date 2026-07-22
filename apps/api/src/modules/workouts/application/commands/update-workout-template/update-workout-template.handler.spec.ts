import { describe, expect, it } from 'vitest'

import { ExerciseMother, WorkoutTemplateMother } from '../../../../../../tests/mothers/workouts'
import {
    FakeClock,
    FakeIdGenerator,
    InMemoryExerciseRepository,
    InMemoryWorkoutTemplateRepository,
} from '../../../../../../tests/doubles/workouts'
import { WorkoutTemplateNotFoundError } from '../../../domain/errors/workouts.errors'
import { UpdateWorkoutTemplateCommand } from './update-workout-template.command'
import { UpdateWorkoutTemplateHandler } from './update-workout-template.handler'

const NOW = new Date('2026-03-10T10:00:00.000Z')
const OWNER = 'u-1'

const SQUAT = ExerciseMother.create({ id: 'ex-squat', slug: 'back-squat', name: 'Back Squat' })

function setup(seedOwner = OWNER) {
    const template = WorkoutTemplateMother.withTree(SQUAT.id, { id: 't-1', ownerId: seedOwner })
    const templates = new InMemoryWorkoutTemplateRepository([template])
    const exercises = new InMemoryExerciseRepository([SQUAT])
    const handler = new UpdateWorkoutTemplateHandler(templates, exercises, new FakeClock(NOW), new FakeIdGenerator())
    return { templates, handler }
}

describe('UpdateWorkoutTemplateHandler', () => {
    it('replaces the content and bumps updatedAt, keeping id and createdAt', async () => {
        const { handler } = setup()

        const view = await handler.execute(
            new UpdateWorkoutTemplateCommand(OWNER, 't-1', {
                name: 'Upper B',
                notes: null,
                exercises: [{ exerciseId: SQUAT.id, sets: [{ plannedReps: '3' }] }],
            }),
        )

        expect(view).toMatchObject({ id: 't-1', name: 'Upper B', notes: null })
        expect(view.exercises).toHaveLength(1)
        expect(view.exercises[0]?.sets).toHaveLength(1)
        expect(view.updatedAt).toEqual(NOW)
    })

    it('rejects updating a template the caller does not own', async () => {
        const { handler } = setup('someone-else')

        await expect(
            handler.execute(new UpdateWorkoutTemplateCommand(OWNER, 't-1', { name: 'X', exercises: [] })),
        ).rejects.toBeInstanceOf(WorkoutTemplateNotFoundError)
    })
})
