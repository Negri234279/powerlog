import { describe, expect, it } from 'vitest'

import { WorkoutTemplateMother } from '../../../../../../tests/mothers/workouts'
import {
    FakeClock,
    FakeIdGenerator,
    InMemoryWorkoutSessionRepository,
    InMemoryWorkoutTemplateRepository,
} from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks, FakeEntitlements, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { NotLinkedToAthleteError, WorkoutTemplateNotFoundError } from '../../../domain/errors/workouts.errors'
import { PlanSessionFromTemplateCommand } from './plan-session-from-template.command'
import { PlanSessionFromTemplateHandler } from './plan-session-from-template.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const EXERCISE = 'ex-squat'

function setup({ links = new FakeCoachLinks(), templateOwner = COACH } = {}) {
    const template = WorkoutTemplateMother.withTree(EXERCISE, { id: 't-1', ownerId: templateOwner })
    const templates = new InMemoryWorkoutTemplateRepository([template])
    const sessions = new InMemoryWorkoutSessionRepository()
    const events = new RecordingEventBus()
    const handler = new PlanSessionFromTemplateHandler(
        sessions,
        templates,
        links,
        new FakeEntitlements(),
        new FakeClock(NOW),
        new FakeIdGenerator(),
        events.asEventBus(),
    )
    return { sessions, handler }
}

describe('PlanSessionFromTemplateHandler', () => {
    it('materializes a planned session owned by the athlete and stamped with the coach', async () => {
        const { sessions, handler } = setup({ links: new FakeCoachLinks().link(COACH, ATHLETE) })

        const view = await handler.execute(new PlanSessionFromTemplateCommand(COACH, ATHLETE, 't-1', null, 'block 1'))

        expect(view).toMatchObject({ userId: ATHLETE, plannedByUserId: COACH, status: 'planned', notes: 'block 1' })
        expect(view.entries[0]?.sets).toHaveLength(2)
        expect(view.entries[0]?.sets[0]).toMatchObject({ plannedWeightKg: 100, weightKg: null })
        expect(await sessions.findById(view.id)).not.toBeNull()
    })

    it('rejects planning for an athlete the coach is not linked to', async () => {
        const { sessions, handler } = setup({ links: new FakeCoachLinks() })

        await expect(handler.execute(new PlanSessionFromTemplateCommand(COACH, ATHLETE, 't-1'))).rejects.toBeInstanceOf(
            NotLinkedToAthleteError,
        )
        expect(sessions.size).toBe(0)
    })

    it('rejects using a template the coach does not own', async () => {
        const { sessions, handler } = setup({
            links: new FakeCoachLinks().link(COACH, ATHLETE),
            templateOwner: 'another-coach',
        })

        await expect(handler.execute(new PlanSessionFromTemplateCommand(COACH, ATHLETE, 't-1'))).rejects.toBeInstanceOf(
            WorkoutTemplateNotFoundError,
        )
        expect(sessions.size).toBe(0)
    })
})
