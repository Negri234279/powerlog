import { describe, expect, it } from 'vitest'

import { MesocycleMother } from '../../../../../../tests/mothers/workouts'
import { InMemoryMesocycleRepository, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { MesocycleNotFoundError } from '../../../domain/errors/workouts.errors'
import { GetMesocycleHandler } from './get-mesocycle.handler'
import { GetMesocycleQuery } from './get-mesocycle.query'

const OWNER = 'u-1'

describe('GetMesocycleHandler', () => {
    it('returns the owner’s mesocycle as a full view', async () => {
        const mesocycles = new InMemoryMesocycleRepository()
        await mesocycles.save(MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: OWNER }))
        const handler = new GetMesocycleHandler(
            mesocycles,
            new InMemoryWorkoutSessionRepository(),
            new FakeCoachLinks(),
        )

        const view = await handler.execute(new GetMesocycleQuery(OWNER, 'm-1'))

        expect(view).toMatchObject({ id: 'm-1', ownerId: OWNER, name: 'Hypertrophy Block', status: 'draft' })
        expect(view.microcycles.map((m) => m.weekIndex)).toEqual([1, 2])
        expect(view.generatedWeeks).toEqual([])
    })

    it('lets the coach read the block they plan for their athlete', async () => {
        const mesocycles = new InMemoryMesocycleRepository()
        await mesocycles.save(
            MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: OWNER, plannedByUserId: 'coach-1' }),
        )
        const handler = new GetMesocycleHandler(
            mesocycles,
            new InMemoryWorkoutSessionRepository(),
            new FakeCoachLinks().link('coach-1', OWNER),
        )

        const view = await handler.execute(new GetMesocycleQuery('coach-1', 'm-1'))

        expect(view).toMatchObject({ id: 'm-1', ownerId: OWNER, plannedByUserId: 'coach-1' })
    })

    it('hides a mesocycle owned by someone else', async () => {
        const mesocycles = new InMemoryMesocycleRepository()
        await mesocycles.save(MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: 'someone-else' }))
        const handler = new GetMesocycleHandler(
            mesocycles,
            new InMemoryWorkoutSessionRepository(),
            new FakeCoachLinks(),
        )

        await expect(handler.execute(new GetMesocycleQuery(OWNER, 'm-1'))).rejects.toBeInstanceOf(
            MesocycleNotFoundError,
        )
    })
})
