import { describe, expect, it } from 'vitest'

import { MesocycleMother } from '../../../../../../tests/mothers/workouts'
import {
    FakeClock,
    FakeIdGenerator,
    FakeMesocycleMetrics,
    InMemoryMesocycleRepository,
    InMemoryWorkoutSessionRepository,
} from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import type { MesocycleContentInput } from '../../../domain/entities/mesocycle.entity'
import {
    MesocycleNotFoundError,
    MesocycleStartDateRequiredError,
    MesocycleWeekAlreadyGeneratedError,
    MesocycleWeekNotFoundError,
} from '../../../domain/errors/workouts.errors'
import { MesocycleNameVO } from '../../../domain/value-objects/mesocycle-name.vo'
import { RepsRangeVO } from '../../../domain/value-objects/reps-range.vo'
import { MesocycleWeekGeneratedIntegrationEvent } from '../../../../../shared/integration-events/mesocycle-week-generated.integration-event'
import { GenerateMesocycleWeekCommand } from './generate-mesocycle-week.command'
import { GenerateMesocycleWeekHandler } from './generate-mesocycle-week.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const OWNER = 'u-1'
const COACH = 'coach-1'
const EXERCISE = 'ex-1'

function setup(
    seed = MesocycleMother.withTree(EXERCISE, { id: 'm-1', ownerId: OWNER }),
    coachLinks = new FakeCoachLinks(),
) {
    const mesocycles = new InMemoryMesocycleRepository([seed])
    const sessions = new InMemoryWorkoutSessionRepository()
    const metrics = new FakeMesocycleMetrics()
    const events = new RecordingEventBus()
    const handler = new GenerateMesocycleWeekHandler(
        mesocycles,
        sessions,
        coachLinks,
        new FakeClock(NOW),
        new FakeIdGenerator(),
        metrics,
        events.asEventBus(),
    )
    return { mesocycles, sessions, metrics, events, handler }
}

describe('GenerateMesocycleWeekHandler', () => {
    it('generates a week into dated planned sessions with the dayâ€™s programmed sets', async () => {
        const { sessions, handler } = setup()

        const views = await handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1))

        expect(views).toHaveLength(1)
        const session = views[0]!
        expect(session).toMatchObject({ userId: OWNER, status: 'planned', mesocycleId: 'm-1', mesocycleWeek: 1 })
        // startDate = 2026-01-05, week 1 day offset 0 â†’ noon UTC that day.
        expect(session.performedAt.toISOString()).toBe('2026-01-05T12:00:00.000Z')
        expect(session.entries[0]!.sets.map((s) => s.plannedWeightKg?.min)).toEqual([100, 90])
        expect(session.entries[0]!.sets.every((s) => s.weightKg === null)).toBe(true)
        expect(await sessions.generatedWeeks('m-1')).toEqual([1])
    })

    it('generates the athleteâ€™s sessions when the coach runs a block they plan for them', async () => {
        const coached = MesocycleMother.withTree(EXERCISE, { id: 'm-1', ownerId: OWNER, plannedByUserId: COACH })
        const { handler } = setup(coached, new FakeCoachLinks().link(COACH, OWNER))

        const [session] = await handler.execute(new GenerateMesocycleWeekCommand(COACH, 'm-1', 1))

        // Owned by the athlete, stamped with the coach who planned it.
        expect(session).toMatchObject({ userId: OWNER, plannedByUserId: COACH, status: 'planned' })
    })

    it('announces the week once, so the athleteâ€™s open app refreshes itself', async () => {
        const coached = MesocycleMother.withTree(EXERCISE, { id: 'm-1', ownerId: OWNER, plannedByUserId: COACH })
        const { handler, events } = setup(coached, new FakeCoachLinks().link(COACH, OWNER))

        const views = await handler.execute(new GenerateMesocycleWeekCommand(COACH, 'm-1', 1))

        // One event for the whole week, not one per session: several sessions
        // landing at once are a single piece of news.
        expect(events.published).toHaveLength(1)
        expect(events.firstOf(MesocycleWeekGeneratedIntegrationEvent)).toMatchObject({
            coachId: COACH,
            athleteId: OWNER,
            mesocycleId: 'm-1',
            week: 1,
            sessions: views.length,
        })
    })

    it('stays quiet when an athlete generates their own week â€” they already know', async () => {
        const { handler, events } = setup()

        await handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1))

        expect(events.published).toEqual([])
    })

    it('counts generated sessions as fresh on first generation and replace on regeneration', async () => {
        const { metrics, handler } = setup()

        await handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1))
        await handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1, null, true))

        expect(metrics.generations).toEqual([
            { mode: 'fresh', sessions: 1 },
            { mode: 'replace', sessions: 1 },
        ])
    })

    it('offsets later weeks by 7 days per microcycle', async () => {
        const { handler } = setup()

        const [session] = await handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 2))

        expect(session!.mesocycleWeek).toBe(2)
        expect(session!.performedAt.toISOString()).toBe('2026-01-12T12:00:00.000Z')
    })

    it('honours an explicit weekStartDate override', async () => {
        const { handler } = setup()

        const [session] = await handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1, '2026-02-02'))

        expect(session!.performedAt.toISOString()).toBe('2026-02-02T12:00:00.000Z')
    })

    it('rejects regenerating an already-generated week unless replace is set', async () => {
        const { sessions, handler } = setup()
        await handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1))

        await expect(handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1))).rejects.toBeInstanceOf(
            MesocycleWeekAlreadyGeneratedError,
        )

        await handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1, null, true))
        // Replace drops the old planned session and recreates it â€” still one for week 1.
        expect(sessions.all().filter((s) => s.mesocycleWeek === 1)).toHaveLength(1)
    })

    it('rejects a week the mesocycle does not have', async () => {
        const { handler } = setup()

        await expect(handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 3))).rejects.toBeInstanceOf(
            MesocycleWeekNotFoundError,
        )
    })

    it('requires a start date to anchor the week', async () => {
        const noStart: MesocycleContentInput = {
            name: MesocycleNameVO.create('No Date'),
            microcycles: [
                {
                    days: [
                        {
                            dayOffset: 0,
                            exercises: [{ exerciseId: EXERCISE, sets: [{ plannedReps: RepsRangeVO.create(5) }] }],
                        },
                    ],
                },
            ],
        }
        const { handler } = setup(MesocycleMother.withTree(EXERCISE, { id: 'm-1', ownerId: OWNER, content: noStart }))

        await expect(handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1))).rejects.toBeInstanceOf(
            MesocycleStartDateRequiredError,
        )
    })

    it('does not generate for a mesocycle owned by someone else', async () => {
        const { handler } = setup(MesocycleMother.withTree(EXERCISE, { id: 'm-1', ownerId: 'someone-else' }))

        await expect(handler.execute(new GenerateMesocycleWeekCommand(OWNER, 'm-1', 1))).rejects.toBeInstanceOf(
            MesocycleNotFoundError,
        )
    })
})
