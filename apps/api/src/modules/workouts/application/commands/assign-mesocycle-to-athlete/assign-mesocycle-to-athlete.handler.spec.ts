import { describe, expect, it } from 'vitest'

import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { FakeClock, FakeIdGenerator, InMemoryMesocycleRepository } from '../../../../../../tests/doubles/workouts'
import { MesocycleMother } from '../../../../../../tests/mothers/workouts'
import { MesocycleNotFoundError, NotLinkedToAthleteError } from '../../../domain/errors/workouts.errors'
import { AssignMesocycleToAthleteCommand } from './assign-mesocycle-to-athlete.command'
import { AssignMesocycleToAthleteHandler } from './assign-mesocycle-to-athlete.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const EXERCISE = 'ex-1'

function setup(linked = true) {
    const source = MesocycleMother.withTree(EXERCISE, { id: 'm-1', ownerId: COACH })
    const mesocycles = new InMemoryMesocycleRepository([source])
    const coachLinks = new FakeCoachLinks()
    if (linked) coachLinks.link(COACH, ATHLETE)

    const handler = new AssignMesocycleToAthleteHandler(
        mesocycles,
        coachLinks,
        new FakeClock(NOW),
        new FakeIdGenerator(),
    )

    return { source, mesocycles, handler }
}

describe('AssignMesocycleToAthleteHandler', () => {
    it('copies the block to the athlete, who owns it while the coach plans it', async () => {
        const { source, mesocycles, handler } = setup()

        const command = new AssignMesocycleToAthleteCommand(COACH, 'm-1', ATHLETE)
        const view = await handler.execute(command)

        expect(view).toMatchObject({ ownerId: ATHLETE, plannedByUserId: COACH, status: 'draft' })
        expect(view.id).not.toBe(source.id)
        expect(view.microcycles).toHaveLength(source.microcycles.length)
        expect(view.microcycles[0]!.days[0]!.exercises[0]!.sets[0]).toMatchObject({
            plannedWeightKg: 100,
            plannedReps: 5,
            rpe: 8,
        })

        const copy = await mesocycles.findById(view.id)
        expect(copy?.ownerId).toBe(ATHLETE)
    })

    it('leaves the source in the coach’s library so it can be assigned again', async () => {
        const { mesocycles, handler } = setup()

        await handler.execute(new AssignMesocycleToAthleteCommand(COACH, 'm-1', ATHLETE))

        const source = await mesocycles.findById('m-1')
        expect(source).toMatchObject({ ownerId: COACH, plannedByUserId: null })
    })

    it('overrides the start date of the athlete’s copy when given one', async () => {
        const { handler } = setup()

        const command = new AssignMesocycleToAthleteCommand(COACH, 'm-1', ATHLETE, '2026-06-01')
        const view = await handler.execute(command)

        expect(view.startDate).toEqual(new Date('2026-06-01'))
    })

    it('rejects assigning to an athlete the coach does not coach', async () => {
        const { handler } = setup(false)

        const command = new AssignMesocycleToAthleteCommand(COACH, 'm-1', ATHLETE)

        await expect(handler.execute(command)).rejects.toBeInstanceOf(NotLinkedToAthleteError)
    })

    it('rejects assigning a mesocycle the coach does not own', async () => {
        const { handler } = setup()

        const command = new AssignMesocycleToAthleteCommand(COACH, 'someone-elses-id', ATHLETE)

        await expect(handler.execute(command)).rejects.toBeInstanceOf(MesocycleNotFoundError)
    })
})
