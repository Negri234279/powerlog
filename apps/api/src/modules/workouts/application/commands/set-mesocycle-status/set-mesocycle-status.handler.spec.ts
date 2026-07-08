import { describe, expect, it } from 'vitest'

import { MesocycleMother } from '../../../../../../tests/mothers/workouts'
import { FakeClock, InMemoryMesocycleRepository } from '../../../../../../tests/doubles/workouts'
import { MesocycleNotFoundError } from '../../../domain/errors/workouts.errors'
import { SetMesocycleStatusCommand } from './set-mesocycle-status.command'
import { SetMesocycleStatusHandler } from './set-mesocycle-status.handler'

const NOW = new Date('2026-05-01T00:00:00.000Z')
const OWNER = 'u-1'

describe('SetMesocycleStatusHandler', () => {
    it('transitions an owned mesocycle’s status', async () => {
        const mesocycles = new InMemoryMesocycleRepository()
        await mesocycles.save(MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: OWNER }))
        const handler = new SetMesocycleStatusHandler(mesocycles, new FakeClock(NOW))

        const view = await handler.execute(new SetMesocycleStatusCommand(OWNER, 'm-1', 'active'))

        expect(view.status).toBe('active')
        expect(view.updatedAt).toEqual(NOW)
    })

    it('does not touch a mesocycle owned by someone else', async () => {
        const mesocycles = new InMemoryMesocycleRepository()
        await mesocycles.save(MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: 'someone-else' }))
        const handler = new SetMesocycleStatusHandler(mesocycles, new FakeClock(NOW))

        await expect(handler.execute(new SetMesocycleStatusCommand(OWNER, 'm-1', 'archived'))).rejects.toBeInstanceOf(
            MesocycleNotFoundError,
        )
    })
})
