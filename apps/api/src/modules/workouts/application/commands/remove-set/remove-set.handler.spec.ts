import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { WeightVO } from '../../../domain/value-objects/weight.vo'
import { RemoveSetCommand } from './remove-set.command'
import { RemoveSetHandler } from './remove-set.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

describe('RemoveSetHandler', () => {
    it('removes a set and reindexes the remaining ones', async () => {
        const session = WorkoutSessionMother.empty({ id: 's-1', userId: 'u-1' })
        session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
        session.addSet('e-1', { id: 'set-1', weight: WeightVO.create(100), reps: RepsVO.create(5) }, NOW)
        session.addSet('e-1', { id: 'set-2', weight: WeightVO.create(90), reps: RepsVO.create(8) }, NOW)
        const sessions = new InMemoryWorkoutSessionRepository([session])
        const handler = new RemoveSetHandler(sessions, new FakeCoachLinks(), new FakeClock(NOW))

        const view = await handler.execute(new RemoveSetCommand('u-1', 's-1', 'e-1', 'set-1'))

        expect(view.entries[0]!.sets).toHaveLength(1)
        expect(view.entries[0]!.sets[0]).toMatchObject({ id: 'set-2', order: 1 })
    })
})
