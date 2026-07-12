import { describe, expect, it } from 'vitest'

import { FakeClock, FakeIdGenerator, InMemoryNotificationRepository } from '../../../../../tests/doubles/notifications'
import { FakeMailer, FakeUserDirectory } from '../../../../../tests/doubles/shared'
import { testCounter } from '../../../../../tests/doubles/shared/test-counter'
import { MesocycleAssignedIntegrationEvent } from '../../../../shared/integration-events/mesocycle-assigned.integration-event'
import { WorkoutSessionPlannedIntegrationEvent } from '../../../../shared/integration-events/workout-session-planned.integration-event'
import { NotificationService } from '../services/notification.service'
import { NotifyOnMesocycleAssigned } from './notify-on-mesocycle-assigned.handler'
import { NotifyOnSessionPlanned } from './notify-on-session-planned.handler'

const PERFORMED_AT = new Date('2026-03-09T12:00:00.000Z')

function setup() {
    const repo = new InMemoryNotificationRepository()
    const service = new NotificationService(
        repo,
        new FakeIdGenerator(['n-1']),
        new FakeClock(),
        new FakeMailer(),
        testCounter(['type']),
    )
    const users = new FakeUserDirectory().seed('coach-1', { username: 'coachy', email: 'coach@powerlog.dev' })

    return { repo, users, service }
}

describe('NotifyOnSessionPlanned', () => {
    it('bells the athlete with the coach’s handle and the session date', async () => {
        const { repo, users, service } = setup()
        const handler = new NotifyOnSessionPlanned(service, users)

        await handler.handle(new WorkoutSessionPlannedIntegrationEvent('coach-1', 'athlete-1', 's-1', PERFORMED_AT))

        const note = repo.all()[0]!
        expect(note.userId).toBe('athlete-1')
        expect(note.type).toBe('session_planned')
        expect(note.data).toEqual({
            sessionId: 's-1',
            coachId: 'coach-1',
            coachUsername: 'coachy',
            performedAt: PERFORMED_AT.toISOString(),
        })
    })

    it('still bells the athlete when the coach’s handle cannot be resolved', async () => {
        const { repo, service } = setup()
        const handler = new NotifyOnSessionPlanned(service, new FakeUserDirectory())

        await handler.handle(new WorkoutSessionPlannedIntegrationEvent('coach-1', 'athlete-1', 's-1', PERFORMED_AT))

        expect(repo.all()).toHaveLength(1)
    })
})

describe('NotifyOnMesocycleAssigned', () => {
    it('bells the athlete with the block’s name', async () => {
        const { repo, users, service } = setup()
        const handler = new NotifyOnMesocycleAssigned(service, users)

        await handler.handle(new MesocycleAssignedIntegrationEvent('coach-1', 'athlete-1', 'm-1', 'Peaking Block'))

        const note = repo.all()[0]!
        expect(note.userId).toBe('athlete-1')
        expect(note.type).toBe('mesocycle_assigned')
        expect(note.data).toEqual({
            mesocycleId: 'm-1',
            name: 'Peaking Block',
            coachId: 'coach-1',
            coachUsername: 'coachy',
        })
    })
})
