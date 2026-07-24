import { describe, expect, it } from 'vitest'

import { FakeClock, FakeIdGenerator, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks, FakeEntitlements, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { FeatureNotInPlanError } from '../../../../../shared/contracts/entitlements'
import { WorkoutSessionPlannedIntegrationEvent } from '../../../../../shared/integration-events/workout-session-planned.integration-event'
import { NotLinkedToAthleteError } from '../../../domain/errors/workouts.errors'
import { PlanWorkoutSessionCommand } from './plan-workout-session.command'
import { PlanWorkoutSessionHandler } from './plan-workout-session.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

function setup(links = new FakeCoachLinks()) {
    const sessions = new InMemoryWorkoutSessionRepository()
    const events = new RecordingEventBus()
    const entitlements = new FakeEntitlements()
    const handler = new PlanWorkoutSessionHandler(
        sessions,
        links,
        entitlements,
        new FakeClock(NOW),
        new FakeIdGenerator(['s-1']),
        events.asEventBus(),
    )
    return { sessions, events, entitlements, handler }
}

describe('PlanWorkoutSessionHandler', () => {
    it('tells the athlete their coach planned a session for them', async () => {
        const { events, handler } = setup(new FakeCoachLinks().link(COACH, ATHLETE))

        const view = await handler.execute(new PlanWorkoutSessionCommand(COACH, ATHLETE, null, null))

        expect(events.firstOf(WorkoutSessionPlannedIntegrationEvent)).toMatchObject({
            coachId: COACH,
            athleteId: ATHLETE,
            sessionId: view.id,
        })
    })

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

    it('refuses to plan for an athlete on a coach plan without plan_sessions', async () => {
        const links = new FakeCoachLinks()
        links.link(COACH, ATHLETE)
        const { sessions, entitlements, handler } = setup(links)
        entitlements.onCoach({ plan: 'coach-lite', planSessions: false })

        await expect(handler.execute(new PlanWorkoutSessionCommand(COACH, ATHLETE))).rejects.toBeInstanceOf(
            FeatureNotInPlanError,
        )
        expect(await sessions.findById('s-1')).toBeNull()
    })
})
