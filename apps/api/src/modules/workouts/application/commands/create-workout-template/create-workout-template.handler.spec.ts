import { describe, expect, it } from 'vitest'

import { ExerciseMother } from '../../../../../../tests/mothers/workouts'
import {
    FakeClock,
    FakeIdGenerator,
    InMemoryExerciseRepository,
    InMemoryWorkoutTemplateRepository,
} from '../../../../../../tests/doubles/workouts'
import { FakeEntitlements } from '../../../../../../tests/doubles/shared'
import { PlanLimitReachedError } from '../../../../../shared/contracts/entitlements'
import { ConflictingIntensityError, ExerciseNotFoundError } from '../../../domain/errors/workouts.errors'
import type { TemplateContentRaw } from '../../template-content'
import { CreateWorkoutTemplateCommand } from './create-workout-template.command'
import { CreateWorkoutTemplateHandler } from './create-workout-template.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const OWNER = 'u-1'

const SQUAT = ExerciseMother.create({ id: 'ex-squat', slug: 'back-squat', name: 'Back Squat' })
const BENCH = ExerciseMother.create({ id: 'ex-bench', slug: 'bench-press', name: 'Bench Press' })

function setup() {
    const templates = new InMemoryWorkoutTemplateRepository()
    const exercises = new InMemoryExerciseRepository([SQUAT, BENCH])
    const entitlements = new FakeEntitlements()
    const handler = new CreateWorkoutTemplateHandler(
        templates,
        exercises,
        entitlements,
        new FakeClock(NOW),
        new FakeIdGenerator(),
    )
    return { templates, entitlements, handler }
}

function content(overrides: Partial<TemplateContentRaw> = {}): TemplateContentRaw {
    return {
        name: 'Upper A',
        notes: 'Push focus',
        exercises: [
            {
                exerciseId: SQUAT.id,
                sets: [
                    { plannedWeight: 100, plannedReps: 5, rpe: 8 },
                    { plannedWeight: 90, plannedReps: 8 },
                ],
            },
            { exerciseId: BENCH.id, sets: [{ plannedReps: 12 }] },
        ],
        ...overrides,
    }
}

describe('CreateWorkoutTemplateHandler', () => {
    it('creates a template owned by the caller with ordered exercises and sets', async () => {
        const { templates, handler } = setup()

        const view = await handler.execute(new CreateWorkoutTemplateCommand(OWNER, content()))

        expect(view).toMatchObject({ ownerId: OWNER, name: 'Upper A', notes: 'Push focus' })
        expect(view.exercises.map((e) => e.order)).toEqual([1, 2])
        expect(view.exercises[0]?.exerciseId).toBe(SQUAT.id)
        expect(view.exercises[0]?.sets.map((s) => s.order)).toEqual([1, 2])
        expect(view.exercises[0]?.sets[0]).toMatchObject({ plannedWeightKg: 100, plannedReps: 5, rpe: 8 })
        expect(view.createdAt).toEqual(NOW)
        expect(await templates.findById(view.id)).not.toBeNull()
    })

    it('converts pound inputs to canonical kilograms', async () => {
        const { handler } = setup()

        const view = await handler.execute(
            new CreateWorkoutTemplateCommand(OWNER, {
                name: 'Heavy',
                exercises: [{ exerciseId: SQUAT.id, sets: [{ unit: 'lb', plannedWeight: 225, plannedReps: 3 }] }],
            }),
        )

        expect(view.exercises[0]?.sets[0]?.plannedWeightKg).toBeCloseTo(102.06, 2)
    })

    it('rejects a template referencing an unknown exercise', async () => {
        const { templates, handler } = setup()

        await expect(
            handler.execute(
                new CreateWorkoutTemplateCommand(OWNER, content({ exercises: [{ exerciseId: 'nope', sets: [] }] })),
            ),
        ).rejects.toBeInstanceOf(ExerciseNotFoundError)
        expect(templates.size).toBe(0)
    })

    it('rejects a set programmed with both RPE and RIR', async () => {
        const { handler } = setup()

        await expect(
            handler.execute(
                new CreateWorkoutTemplateCommand(
                    OWNER,
                    content({ exercises: [{ exerciseId: SQUAT.id, sets: [{ rpe: 8, rir: 2 }] }] }),
                ),
            ),
        ).rejects.toBeInstanceOf(ConflictingIntensityError)
    })

    it('refuses to create a template on a plan that allows none', async () => {
        const { templates, entitlements, handler } = setup()
        entitlements.onAthlete({ plan: 'athlete-free', maxTemplates: 0 })

        await expect(handler.execute(new CreateWorkoutTemplateCommand(OWNER, content()))).rejects.toBeInstanceOf(
            PlanLimitReachedError,
        )
        expect(templates.size).toBe(0)
    })

    it('refuses to create a template once the plan cap is reached', async () => {
        const { templates, entitlements, handler } = setup()
        entitlements.onAthlete({ plan: 'athlete-free', maxTemplates: 1 })

        await handler.execute(new CreateWorkoutTemplateCommand(OWNER, content()))
        await expect(handler.execute(new CreateWorkoutTemplateCommand(OWNER, content()))).rejects.toBeInstanceOf(
            PlanLimitReachedError,
        )
        expect(templates.size).toBe(1)
    })

    it('charges a coaching template to the COACH plan, not the athlete one', async () => {
        // The coach plan allows the coaching template; the athlete cap is exhausted
        // but irrelevant — the two scopes draw on different plans.
        const { templates, entitlements, handler } = setup()
        entitlements.onAthlete({ plan: 'athlete-free', maxTemplates: 0 }).onCoach({ maxTemplates: null })

        const view = await handler.execute(new CreateWorkoutTemplateCommand(OWNER, content(), 'coaching'))

        expect(view.id).toBeDefined()
        expect(templates.size).toBe(1)
    })

    it('refuses a coaching template once the COACH plan cap is reached', async () => {
        const { templates, entitlements, handler } = setup()
        entitlements.onCoach({ plan: 'coach-free', maxTemplates: 1 })

        await handler.execute(new CreateWorkoutTemplateCommand(OWNER, content(), 'coaching'))
        await expect(
            handler.execute(new CreateWorkoutTemplateCommand(OWNER, content(), 'coaching')),
        ).rejects.toBeInstanceOf(PlanLimitReachedError)
        expect(templates.size).toBe(1)
    })

    it('counts the two scopes independently — a personal cap does not block a coaching template', async () => {
        // One personal template already at the personal cap of 1; a coaching template
        // still goes through because it is counted (and capped) on its own scope.
        const { templates, entitlements, handler } = setup()
        entitlements.onAthlete({ maxTemplates: 1 }).onCoach({ maxTemplates: 1 })

        await handler.execute(new CreateWorkoutTemplateCommand(OWNER, content(), 'personal'))
        await handler.execute(new CreateWorkoutTemplateCommand(OWNER, content(), 'coaching'))

        expect(templates.size).toBe(2)
        // Each scope is now at its cap of 1: a second of either is refused.
        await expect(
            handler.execute(new CreateWorkoutTemplateCommand(OWNER, content(), 'personal')),
        ).rejects.toBeInstanceOf(PlanLimitReachedError)
    })
})
