import { describe, expect, it } from 'vitest'

import { ExerciseMother, MesocycleMother } from '../../../../../../tests/mothers/workouts'
import {
    FakeClock,
    FakeIdGenerator,
    InMemoryExerciseRepository,
    InMemoryMesocycleRepository,
} from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { MesocycleManagedByCoachError, MesocycleNotFoundError } from '../../../domain/errors/workouts.errors'
import type { MesocycleContentRaw } from '../../mesocycle-content'
import { UpdateMesocycleCommand } from './update-mesocycle.command'
import { UpdateMesocycleHandler } from './update-mesocycle.handler'

const NOW = new Date('2026-04-01T00:00:00.000Z')
const OWNER = 'u-1'
const COACH = 'coach-1'
const SQUAT = ExerciseMother.create({ id: 'ex-squat', slug: 'back-squat', name: 'Back Squat' })

function setup(coachLinks = new FakeCoachLinks()) {
    const mesocycles = new InMemoryMesocycleRepository()
    const exercises = new InMemoryExerciseRepository([SQUAT])
    const handler = new UpdateMesocycleHandler(
        mesocycles,
        exercises,
        coachLinks,
        new FakeClock(NOW),
        new FakeIdGenerator(),
    )
    return { mesocycles, handler }
}

/** A block the coach plans for the athlete (who owns it). */
function coachedBlock() {
    return MesocycleMother.withTree(SQUAT.id, { id: 'm-1', ownerId: OWNER, plannedByUserId: COACH })
}

const newContent: MesocycleContentRaw = {
    name: 'Strength Block',
    goal: 'strength',
    microcycles: [{ days: [{ dayOffset: 3, exercises: [{ exerciseId: SQUAT.id, sets: [{ plannedReps: 3 }] }] }] }],
}

describe('UpdateMesocycleHandler', () => {
    it('replaces an owned mesocycle’s details and tree', async () => {
        const { mesocycles, handler } = setup()
        const mesocycle = MesocycleMother.withTree(SQUAT.id, { id: 'm-1', ownerId: OWNER })
        await mesocycles.save(mesocycle)

        const view = await handler.execute(new UpdateMesocycleCommand(OWNER, 'm-1', newContent))

        expect(view).toMatchObject({ id: 'm-1', name: 'Strength Block', goal: 'strength' })
        expect(view.microcycles).toHaveLength(1)
        expect(view.microcycles[0]!.days[0]!.dayOffset).toBe(3)
        expect(view.updatedAt).toEqual(NOW)
    })

    it('does not update a mesocycle owned by someone else', async () => {
        const { mesocycles, handler } = setup()
        await mesocycles.save(MesocycleMother.withTree(SQUAT.id, { id: 'm-1', ownerId: 'someone-else' }))

        await expect(handler.execute(new UpdateMesocycleCommand(OWNER, 'm-1', newContent))).rejects.toBeInstanceOf(
            MesocycleNotFoundError,
        )
    })

    it('lets the coach edit the block they plan for their athlete', async () => {
        const { mesocycles, handler } = setup(new FakeCoachLinks().link(COACH, OWNER))
        await mesocycles.save(coachedBlock())

        const view = await handler.execute(new UpdateMesocycleCommand(COACH, 'm-1', newContent))

        expect(view).toMatchObject({ id: 'm-1', ownerId: OWNER, plannedByUserId: COACH, name: 'Strength Block' })
    })

    it('keeps a coached block read-only for the athlete who owns it', async () => {
        const { mesocycles, handler } = setup(new FakeCoachLinks().link(COACH, OWNER))
        await mesocycles.save(coachedBlock())

        await expect(handler.execute(new UpdateMesocycleCommand(OWNER, 'm-1', newContent))).rejects.toBeInstanceOf(
            MesocycleManagedByCoachError,
        )
    })

    it('hands a coached block back to its owner once the coaching link is gone', async () => {
        // No link seeded: that coach no longer coaches them.
        const { mesocycles, handler } = setup()
        await mesocycles.save(coachedBlock())

        const view = await handler.execute(new UpdateMesocycleCommand(OWNER, 'm-1', newContent))
        expect(view.name).toBe('Strength Block')

        await expect(handler.execute(new UpdateMesocycleCommand(COACH, 'm-1', newContent))).rejects.toBeInstanceOf(
            MesocycleNotFoundError,
        )
    })
})
