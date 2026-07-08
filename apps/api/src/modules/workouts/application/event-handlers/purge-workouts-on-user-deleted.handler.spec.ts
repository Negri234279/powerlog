import { describe, expect, it } from 'vitest'

import { MesocycleMother, WorkoutSessionMother, WorkoutTemplateMother } from '../../../../../tests/mothers/workouts'
import {
    InMemoryMesocycleRepository,
    InMemoryWorkoutSessionRepository,
    InMemoryWorkoutTemplateRepository,
} from '../../../../../tests/doubles/workouts'
import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { PurgeWorkoutsOnUserDeleted } from './purge-workouts-on-user-deleted.handler'

const USER = 'u-1'
const OTHER = 'u-2'
const EXERCISE = 'ex-1'

function setup() {
    const sessions = new InMemoryWorkoutSessionRepository([
        WorkoutSessionMother.empty({ userId: USER }),
        WorkoutSessionMother.empty({ userId: USER }),
        // A session the deleted user (a coach) planned for someone else — owned by
        // the athlete, so it must survive.
        WorkoutSessionMother.empty({ userId: OTHER, plannedByUserId: USER }),
    ])
    const templates = new InMemoryWorkoutTemplateRepository([
        WorkoutTemplateMother.withTree(EXERCISE, { ownerId: USER }),
        WorkoutTemplateMother.withTree(EXERCISE, { ownerId: OTHER }),
    ])
    const mesocycles = new InMemoryMesocycleRepository([
        MesocycleMother.withTree(EXERCISE, { ownerId: USER }),
        MesocycleMother.withTree(EXERCISE, { ownerId: OTHER }),
    ])
    const handler = new PurgeWorkoutsOnUserDeleted(sessions, templates, mesocycles)
    return { sessions, templates, mesocycles, handler }
}

describe('PurgeWorkoutsOnUserDeleted', () => {
    it("erases the user's own sessions, templates and mesocycles, leaving others' intact", async () => {
        const { sessions, templates, mesocycles, handler } = setup()

        await handler.handle(new UserDeletedIntegrationEvent(USER))

        // Only the athlete-owned coach-planned session remains.
        expect(sessions.size).toBe(1)
        // Only the other user's template + mesocycle remain.
        expect(templates.size).toBe(1)
        expect(mesocycles.size).toBe(1)
    })

    it('is a no-op for a user with no workout data', async () => {
        const { sessions, templates, mesocycles, handler } = setup()

        await expect(handler.handle(new UserDeletedIntegrationEvent('ghost'))).resolves.toBeUndefined()
        expect(sessions.size).toBe(3)
        expect(templates.size).toBe(2)
        expect(mesocycles.size).toBe(2)
    })
})
