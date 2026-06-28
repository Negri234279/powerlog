import { describe, expect, it } from 'vitest'

import { FakeClock, FakeIdGenerator, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { NotLinkedToAthleteError } from '../../../domain/errors/workouts.errors'
import { PlanWorkoutSessionCommand } from './plan-workout-session.command'
import { PlanWorkoutSessionHandler } from './plan-workout-session.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

function setup(links = new FakeCoachLinks()) {
    const sessions = new InMemoryWorkoutSessionRepository()
    const handler = new PlanWorkoutSessionHandler(sessions, links, new FakeClock(NOW), new FakeIdGenerator(['s-1']))
    return { sessions, handler }
}

describe('PlanWorkoutSessionHandler', () => {
    it('creates a planned session owned by the athlete and stamped with the coach', async () => {
        const { sessions, handler } = setup(new FakeCoachLinks().link(COACH, ATHLETE))

        const view = await handler.execute(new PlanWorkoutSessionCommand(COACH, ATHLETE, null, 'squat focus'))

        expect(view).toMatchObject({
            id: 's-1',
            userId: ATHLETE,
            plannedByUserId: COACH,
            status: 'planned',
            notes: 'squat focus',
        })
        expect(await sessions.findById('s-1')).not.toBeNull()
    })

    it('rejects planning for an athlete the coach is not linked to', async () => {
        const { sessions, handler } = setup()

        await expect(handler.execute(new PlanWorkoutSessionCommand(COACH, ATHLETE))).rejects.toBeInstanceOf(
            NotLinkedToAthleteError,
        )
        expect(await sessions.findById('s-1')).toBeNull()
    })
})
