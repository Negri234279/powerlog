import { describe, expect, it } from 'vitest'

import { ExerciseMother } from '../../../../../../tests/mothers/workouts'
import {
    FakeClock,
    FakeIdGenerator,
    InMemoryExerciseRepository,
    InMemoryMesocycleRepository,
} from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks, FakeEntitlements, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { FeatureNotInPlanError, PlanLimitReachedError } from '../../../../../shared/contracts/entitlements'
import {
    ConflictingIntensityError,
    ExerciseNotFoundError,
    NotLinkedToAthleteError,
} from '../../../domain/errors/workouts.errors'
import type { MesocycleContentRaw } from '../../mesocycle-content'
import { MesocycleCreatedFromAiDraftIntegrationEvent } from '../../../../../shared/integration-events/mesocycle-created-from-ai-draft.integration-event'
import { CreateMesocycleCommand } from './create-mesocycle.command'
import { CreateMesocycleHandler } from './create-mesocycle.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const OWNER = 'u-1'
const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

const SQUAT = ExerciseMother.create({ id: 'ex-squat', slug: 'back-squat', name: 'Back Squat' })

function setup(coachLinks = new FakeCoachLinks()) {
    const mesocycles = new InMemoryMesocycleRepository()
    const exercises = new InMemoryExerciseRepository([SQUAT])
    const entitlements = new FakeEntitlements()
    const events = new RecordingEventBus()
    const handler = new CreateMesocycleHandler(
        mesocycles,
        exercises,
        coachLinks,
        entitlements,
        new FakeClock(NOW),
        new FakeIdGenerator(),
        events.asEventBus(),
    )
    return { mesocycles, entitlements, events, handler }
}

function content(overrides: Partial<MesocycleContentRaw> = {}): MesocycleContentRaw {
    return {
        name: 'Hypertrophy Block',
        goal: 'hypertrophy',
        startDate: '2026-01-05',
        microcycles: [
            {
                label: 'Week 1',
                days: [
                    {
                        dayOffset: 0,
                        label: 'Day 1',
                        exercises: [
                            {
                                exerciseId: SQUAT.id,
                                sets: [
                                    { plannedWeight: '100', plannedReps: '5', rpe: '8' },
                                    { plannedWeight: '90', plannedReps: '8' },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                label: 'Week 2',
                days: [
                    {
                        dayOffset: 0,
                        exercises: [{ exerciseId: SQUAT.id, sets: [{ plannedWeight: '105', plannedReps: '5' }] }],
                    },
                ],
            },
        ],
        ...overrides,
    }
}

describe('CreateMesocycleHandler', () => {
    it('creates a draft mesocycle owned by the caller with an ordered tree', async () => {
        const { mesocycles, handler } = setup()

        const view = await handler.execute(new CreateMesocycleCommand(OWNER, content()))

        expect(view).toMatchObject({ ownerId: OWNER, name: 'Hypertrophy Block', goal: 'hypertrophy', status: 'draft' })
        expect(view.generatedWeeks).toEqual([])
        expect(view.microcycles.map((m) => m.weekIndex)).toEqual([1, 2])
        const day1 = view.microcycles[0]!.days[0]!
        expect(day1.dayOffset).toBe(0)
        expect(day1.exercises[0]!.sets.map((s) => s.order)).toEqual([1, 2])
        expect(day1.exercises[0]!.sets[0]).toMatchObject({
            plannedWeightKg: { min: 100, max: 100 },
            plannedReps: { min: 5, max: 5 },
            rpe: { min: 8, max: 8 },
        })
        expect(view.createdAt).toEqual(NOW)
        expect(await mesocycles.findById(view.id)).not.toBeNull()
    })

    it('creates a block for an athlete: they own it, the coach is stamped as its planner', async () => {
        const { handler } = setup(new FakeCoachLinks().link(COACH, ATHLETE))

        const view = await handler.execute(new CreateMesocycleCommand(COACH, content(), ATHLETE))

        expect(view).toMatchObject({ ownerId: ATHLETE, plannedByUserId: COACH, status: 'draft' })
    })

    it('rejects building a block for an athlete the coach does not coach', async () => {
        const { mesocycles, handler } = setup()

        await expect(handler.execute(new CreateMesocycleCommand(COACH, content(), ATHLETE))).rejects.toBeInstanceOf(
            NotLinkedToAthleteError,
        )
        expect(mesocycles.size).toBe(0)
    })

    it('converts pound inputs to canonical kilograms', async () => {
        const { handler } = setup()

        const view = await handler.execute(
            new CreateMesocycleCommand(OWNER, {
                name: 'Heavy',
                microcycles: [
                    {
                        days: [
                            {
                                dayOffset: 0,
                                exercises: [
                                    {
                                        exerciseId: SQUAT.id,
                                        sets: [{ unit: 'lb', plannedWeight: '225', plannedReps: '3' }],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }),
        )

        expect(view.microcycles[0]!.days[0]!.exercises[0]!.sets[0]!.plannedWeightKg?.min).toBeCloseTo(102.06, 2)
    })

    it('rejects a mesocycle referencing an unknown exercise', async () => {
        const { mesocycles, handler } = setup()

        await expect(
            handler.execute(
                new CreateMesocycleCommand(OWNER, {
                    name: 'X',
                    microcycles: [{ days: [{ dayOffset: 0, exercises: [{ exerciseId: 'nope', sets: [] }] }] }],
                }),
            ),
        ).rejects.toBeInstanceOf(ExerciseNotFoundError)
        expect(mesocycles.size).toBe(0)
    })

    it('rejects a set programmed with both RPE and RIR', async () => {
        const { handler } = setup()

        await expect(
            handler.execute(
                new CreateMesocycleCommand(OWNER, {
                    name: 'X',
                    microcycles: [
                        {
                            days: [
                                { dayOffset: 0, exercises: [{ exerciseId: SQUAT.id, sets: [{ rpe: '8', rir: '2' }] }] },
                            ],
                        },
                    ],
                }),
            ),
        ).rejects.toBeInstanceOf(ConflictingIntensityError)
    })

    it('refuses to build a block of your own on a plan that allows none', async () => {
        const { mesocycles, entitlements, handler } = setup()
        entitlements.onAthlete({ plan: 'athlete-basic', maxMesocycles: 0 })

        await expect(handler.execute(new CreateMesocycleCommand(OWNER, content()))).rejects.toBeInstanceOf(
            PlanLimitReachedError,
        )
        expect(mesocycles.size).toBe(0)
    })

    it("charges a block built FOR an athlete to the coach's plan_sessions, not to mesocycles", async () => {
        // Same command, two features: a coach whose plan can't program for others is
        // stopped even though they may design blocks for themselves.
        const links = new FakeCoachLinks()
        links.link(COACH, ATHLETE)
        const { mesocycles, entitlements, handler } = setup(links)
        entitlements.onCoach({ plan: 'coach-lite', maxMesocycles: null, planSessions: false })

        await expect(handler.execute(new CreateMesocycleCommand(COACH, content(), ATHLETE))).rejects.toBeInstanceOf(
            FeatureNotInPlanError,
        )
        expect(mesocycles.size).toBe(0)
    })

    it("caps blocks built for athletes on the COACH plan's maxMesocycles", async () => {
        // The coach may program (plan_sessions) but their coaching-block quota is 1:
        // the second block for an athlete is refused, independently of their own.
        const links = new FakeCoachLinks()
        links.link(COACH, ATHLETE)
        const { mesocycles, entitlements, handler } = setup(links)
        entitlements.onCoach({ plan: 'coach-free', planSessions: true, maxMesocycles: 1 })

        await handler.execute(new CreateMesocycleCommand(COACH, content(), ATHLETE))
        await expect(handler.execute(new CreateMesocycleCommand(COACH, content(), ATHLETE))).rejects.toBeInstanceOf(
            PlanLimitReachedError,
        )
        // Only the first block was created.
        expect(mesocycles.size).toBe(1)
    })

    it("counts a coach's own blocks apart from the ones they build for athletes", async () => {
        // A coach at their coaching cap of 1 (one block already for the athlete) can
        // still build a block for THEMSELVES â€” that draws on the athlete plan.
        const links = new FakeCoachLinks()
        links.link(COACH, ATHLETE)
        const { mesocycles, entitlements, handler } = setup(links)
        entitlements.onCoach({ planSessions: true, maxMesocycles: 1 }).onAthlete({ maxMesocycles: null })

        await handler.execute(new CreateMesocycleCommand(COACH, content(), ATHLETE))
        // Their own block is fine â€” different scope, different plan.
        await handler.execute(new CreateMesocycleCommand(COACH, content()))

        expect(mesocycles.size).toBe(2)
    })

    it('tells the AI module which block its draft became', async () => {
        const { handler, events } = setup()
        const command = new CreateMesocycleCommand(OWNER, content(), undefined, 'draft-1')

        const view = await handler.execute(command)

        const announced = events.published.find(
            (event): event is MesocycleCreatedFromAiDraftIntegrationEvent =>
                event instanceof MesocycleCreatedFromAiDraftIntegrationEvent,
        )
        expect(announced).toMatchObject({ userId: OWNER, draftId: 'draft-1', mesocycleId: view.id })
    })

    it('says nothing about AI drafts when the block was built by hand', async () => {
        const { handler, events } = setup()

        await handler.execute(new CreateMesocycleCommand(OWNER, content()))

        expect(events.published.some((event) => event instanceof MesocycleCreatedFromAiDraftIntegrationEvent)).toBe(
            false,
        )
    })
})
