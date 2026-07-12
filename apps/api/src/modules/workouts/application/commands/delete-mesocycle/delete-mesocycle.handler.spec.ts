import { describe, expect, it } from 'vitest'

import { MesocycleMother } from '../../../../../../tests/mothers/workouts'
import { InMemoryMesocycleRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { MesocycleNotFoundError } from '../../../domain/errors/workouts.errors'
import { DeleteMesocycleCommand } from './delete-mesocycle.command'
import { DeleteMesocycleHandler } from './delete-mesocycle.handler'

const OWNER = 'u-1'

describe('DeleteMesocycleHandler', () => {
    it('deletes an owned mesocycle', async () => {
        const mesocycles = new InMemoryMesocycleRepository()
        await mesocycles.save(MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: OWNER }))
        const handler = new DeleteMesocycleHandler(mesocycles, new FakeCoachLinks())

        const result = await handler.execute(new DeleteMesocycleCommand(OWNER, 'm-1'))

        expect(result).toBe(true)
        expect(await mesocycles.findById('m-1')).toBeNull()
    })

    it('does not delete a mesocycle owned by someone else', async () => {
        const mesocycles = new InMemoryMesocycleRepository()
        await mesocycles.save(MesocycleMother.withTree('ex-1', { id: 'm-1', ownerId: 'someone-else' }))
        const handler = new DeleteMesocycleHandler(mesocycles, new FakeCoachLinks())

        await expect(handler.execute(new DeleteMesocycleCommand(OWNER, 'm-1'))).rejects.toBeInstanceOf(
            MesocycleNotFoundError,
        )
        expect(await mesocycles.findById('m-1')).not.toBeNull()
    })
})
