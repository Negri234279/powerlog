import { describe, expect, it } from 'vitest'

import { WorkoutTemplateMother } from '../../../../../../tests/mothers/workouts'
import {
    FakeClock,
    FakeIdGenerator,
    InMemoryWorkoutSessionRepository,
    InMemoryWorkoutTemplateRepository,
} from '../../../../../../tests/doubles/workouts'
import { WorkoutTemplateNotFoundError } from '../../../domain/errors/workouts.errors'
import { CreateSessionFromTemplateCommand } from './create-session-from-template.command'
import { CreateSessionFromTemplateHandler } from './create-session-from-template.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const OWNER = 'u-1'
const EXERCISE = 'ex-squat'

function setup(seedOwner = OWNER) {
    const template = WorkoutTemplateMother.withTree(EXERCISE, { id: 't-1', ownerId: seedOwner })
    const templates = new InMemoryWorkoutTemplateRepository([template])
    const sessions = new InMemoryWorkoutSessionRepository()
    const handler = new CreateSessionFromTemplateHandler(sessions, templates, new FakeClock(NOW), new FakeIdGenerator())
    return { sessions, handler }
}

describe('CreateSessionFromTemplateHandler', () => {
    it('materializes a planned session owned by the caller with programmed (not performed) sets', async () => {
        const { sessions, handler } = setup()

        const view = await handler.execute(new CreateSessionFromTemplateCommand(OWNER, 't-1', null, 'week 1'))

        expect(view).toMatchObject({ userId: OWNER, status: 'planned', notes: 'week 1', plannedByUserId: null })
        expect(view.performedAt).toEqual(NOW)
        expect(view.entries).toHaveLength(1)
        expect(view.entries[0]?.exerciseId).toBe(EXERCISE)

        const sets = view.entries[0]?.sets ?? []
        expect(sets).toHaveLength(2)
        // Programmed targets are copied; performed values + e1RM stay empty.
        expect(sets[0]).toMatchObject({
            plannedWeightKg: 100,
            plannedReps: 5,
            weightKg: null,
            reps: null,
            e1rmKg: null,
        })
        expect(await sessions.findById(view.id)).not.toBeNull()
    })

    it('rejects creating from a template the caller does not own', async () => {
        const { sessions, handler } = setup('someone-else')

        await expect(handler.execute(new CreateSessionFromTemplateCommand(OWNER, 't-1'))).rejects.toBeInstanceOf(
            WorkoutTemplateNotFoundError,
        )
        expect(sessions.size).toBe(0)
    })
})
