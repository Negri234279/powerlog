import { describe, expect, it } from 'vitest'

import { MesocycleMother } from '../../../../../../tests/mothers/workouts'
import { FakeClock, FakeMesocycleMetrics, InMemoryMesocycleRepository } from '../../../../../../tests/doubles/workouts'
import { MesocycleNotFoundError } from '../../../domain/errors/workouts.errors'
import { SetMesocycleStatusCommand } from './set-mesocycle-status.command'
import { SetMesocycleStatusHandler } from './set-mesocycle-status.handler'

const NOW = new Date('2026-05-01T00:00:00.000Z')
const OWNER = 'u-1'

function setup() {
    const mesocycles = new InMemoryMesocycleRepository()
    const metrics = new FakeMesocycleMetrics()
    const handler = new SetMesocycleStatusHandler(mesocycles, new FakeClock(NOW), metrics)
    return { mesocycles, metrics, handler }
}

describe('SetMesocycleStatusHandler', () => {
    it('transitions an owned mesocycle’s status', async () => {
        const { mesocycles, handler } = setup()
        await mesocycles.save(MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: OWNER }))

        const view = await handler.execute(new SetMesocycleStatusCommand(OWNER, 'm-1', 'active'))

        expect(view.status).toBe('active')
        expect(view.updatedAt).toEqual(NOW)
    })

    it('counts the transition by its target status', async () => {
        const { mesocycles, metrics, handler } = setup()
        await mesocycles.save(MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: OWNER }))

        await handler.execute(new SetMesocycleStatusCommand(OWNER, 'm-1', 'completed'))

        expect(metrics.transitions).toEqual(['completed'])
    })

    it('does not touch a mesocycle owned by someone else', async () => {
        const { mesocycles, metrics, handler } = setup()
        await mesocycles.save(MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: 'someone-else' }))

        await expect(handler.execute(new SetMesocycleStatusCommand(OWNER, 'm-1', 'archived'))).rejects.toBeInstanceOf(
            MesocycleNotFoundError,
        )
        expect(metrics.transitions).toEqual([])
    })
})
