import { describe, expect, it } from 'vitest'

import { FakeClock, FakeIdGenerator, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { CreateWorkoutSessionCommand } from './create-workout-session.command'
import { CreateWorkoutSessionHandler } from './create-workout-session.handler'

const NOW = new Date('2026-03-01T10:00:00.000Z')

function setup() {
    const sessions = new InMemoryWorkoutSessionRepository()
    const handler = new CreateWorkoutSessionHandler(sessions, new FakeClock(NOW), new FakeIdGenerator(['s-1']))
    return { sessions, handler }
}

describe('CreateWorkoutSessionHandler', () => {
    it('creates a planned session owned by the user, defaulting performedAt to now', async () => {
        const { sessions, handler } = setup()

        const view = await handler.execute(new CreateWorkoutSessionCommand('u-1'))

        expect(view).toMatchObject({ id: 's-1', userId: 'u-1', status: 'planned', entries: [] })
        expect(view.performedAt).toEqual(NOW)
        expect(await sessions.findById('s-1')).not.toBeNull()
    })

    it('uses the provided performedAt and notes', async () => {
        const { handler } = setup()

        const view = await handler.execute(
            new CreateWorkoutSessionCommand('u-1', '2026-02-20T08:00:00.000Z', 'leg day'),
        )

        expect(view.performedAt).toEqual(new Date('2026-02-20T08:00:00.000Z'))
        expect(view.notes).toBe('leg day')
    })
})
