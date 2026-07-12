import { describe, expect, it } from 'vitest'

import { FakeClock, FakeIdGenerator, InMemoryNotificationRepository } from '../../../../../tests/doubles/notifications'
import { FakeMailer } from '../../../../../tests/doubles/shared'
import { testCounter } from '../../../../../tests/doubles/shared/test-counter'
import { CoachLinkEstablishedIntegrationEvent } from '../../../../shared/integration-events/coach-link-established.integration-event'
import { NotificationService } from '../services/notification.service'
import { NotifyOnCoachLinkEstablished } from './notify-on-coach-link-established.handler'

function setup() {
    const repo = new InMemoryNotificationRepository()
    const service = new NotificationService(
        repo,
        new FakeIdGenerator(['n-1', 'n-2']),
        new FakeClock(),
        new FakeMailer(),
        testCounter(['type']),
    )
    const handler = new NotifyOnCoachLinkEstablished(service)
    return { handler, repo }
}

describe('NotifyOnCoachLinkEstablished', () => {
    it('bells both the coach and the athlete', async () => {
        const { handler, repo } = setup()

        await handler.handle(new CoachLinkEstablishedIntegrationEvent('coach-1', 'athlete-1', 'coachy', 'athletey'))

        const all = repo.all()
        expect(all).toHaveLength(2)

        const coachNote = all.find((n) => n.userId === 'coach-1')
        expect(coachNote?.type).toBe('athlete_linked')
        expect(coachNote?.data).toEqual({ athleteId: 'athlete-1', athleteUsername: 'athletey' })

        const athleteNote = all.find((n) => n.userId === 'athlete-1')
        expect(athleteNote?.type).toBe('coach_linked')
        expect(athleteNote?.data).toEqual({ coachId: 'coach-1', coachUsername: 'coachy' })
    })
})
