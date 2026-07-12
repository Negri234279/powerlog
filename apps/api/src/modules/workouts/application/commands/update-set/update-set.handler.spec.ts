import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { WeightVO } from '../../../domain/value-objects/weight.vo'
import { UpdateSetCommand } from './update-set.command'
import { UpdateSetHandler } from './update-set.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup() {
    const session = WorkoutSessionMother.empty({ id: 's-1', userId: 'u-1' })
    session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
    session.addSet('e-1', { id: 'set-1', weight: WeightVO.create(100), reps: RepsVO.create(5) }, NOW)
    const sessions = new InMemoryWorkoutSessionRepository([session])
    const handler = new UpdateSetHandler(sessions, new FakeCoachLinks(), new FakeClock(NOW))
    return { handler }
}

describe('UpdateSetHandler', () => {
    it('edits the weight and recomputes e1RM', async () => {
        const { handler } = setup()

        const view = await handler.execute(new UpdateSetCommand('u-1', 's-1', 'e-1', 'set-1', { weight: 110 }))

        expect(view.entries[0]!.sets[0]!.weightKg).toBe(110)
        expect(view.entries[0]!.sets[0]!.e1rmKg).toBe(128.33)
    })

    it('clears a value with null and nulls the derived e1RM', async () => {
        const { handler } = setup()

        const view = await handler.execute(new UpdateSetCommand('u-1', 's-1', 'e-1', 'set-1', { reps: null }))

        expect(view.entries[0]!.sets[0]!.reps).toBeNull()
        expect(view.entries[0]!.sets[0]!.e1rmKg).toBeNull()
    })
})
