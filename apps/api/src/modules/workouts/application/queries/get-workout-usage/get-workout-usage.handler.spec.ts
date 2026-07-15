import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
    InMemoryMesocycleRepository,
    InMemoryWorkoutSessionRepository,
    InMemoryWorkoutTemplateRepository,
} from '../../../../../../tests/doubles/workouts'
import { MesocycleMother, WorkoutSessionMother, WorkoutTemplateMother } from '../../../../../../tests/mothers/workouts'
import { GetWorkoutUsageHandler } from './get-workout-usage.handler'
import { GetWorkoutUsageQuery } from './get-workout-usage.query'

const USER = 'user-1'
const COACH = 'coach-1'
const EX = randomUUID()

describe('GetWorkoutUsageHandler', () => {
    it("counts only what the user created for themselves, matching the caps' scope", async () => {
        const templates = new InMemoryWorkoutTemplateRepository([
            WorkoutTemplateMother.withTree(EX, { id: 't-1', ownerId: USER }),
            WorkoutTemplateMother.withTree(EX, { id: 't-2', ownerId: USER }),
            WorkoutTemplateMother.withTree(EX, { id: 't-3', ownerId: 'someone-else' }),
        ])
        const mesocycles = new InMemoryMesocycleRepository([
            MesocycleMother.withTree(EX, { id: 'm-1', ownerId: USER }),
            // Planned by a coach for the user — paid by the coach's plan, not counted.
            MesocycleMother.withTree(EX, { id: 'm-2', ownerId: USER, plannedByUserId: COACH }),
        ])
        const sessions = new InMemoryWorkoutSessionRepository([
            WorkoutSessionMother.empty({ id: 's-1', userId: USER }),
            WorkoutSessionMother.empty({ id: 's-2', userId: USER }),
            // A coach-planned session is the athlete's, but the coach's plan pays for it.
            WorkoutSessionMother.empty({ id: 's-3', userId: USER, plannedByUserId: COACH }),
        ])

        const handler = new GetWorkoutUsageHandler(templates, mesocycles, sessions)

        const usage = await handler.execute(new GetWorkoutUsageQuery(USER))

        expect(usage).toEqual({ templates: 2, mesocycles: 1, workouts: 2 })
    })
})
