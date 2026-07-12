import { describe, expect, it } from 'vitest'

import { FakeClock, FakeIdGenerator, InMemoryNotificationRepository } from '../../../../../tests/doubles/notifications'
import { FakeMailer } from '../../../../../tests/doubles/shared'
import { testCounter } from '../../../../../tests/doubles/shared/test-counter'
import { CoachLinkRemovedIntegrationEvent } from '../../../../shared/integration-events/coach-link-removed.integration-event'
import type { UnlinkedBy } from '../../../../shared/integration-events/coach-link-removed.integration-event'
import { NotificationService } from '../services/notification.service'
import { NotifyOnCoachLinkRemoved } from './notify-on-coach-link-removed.handler'

function setup() {
    const repo = new InMemoryNotificationRepository()
    const service = new NotificationService(
        repo,
        new FakeIdGenerator(['n-1']),
        new FakeClock(),
        new FakeMailer(),
        testCounter(['type']),
    )

    return { handler: new NotifyOnCoachLinkRemoved(service), repo }
}

function removedBy(unlinkedBy: UnlinkedBy): CoachLinkRemovedIntegrationEvent {
    return new CoachLinkRemovedIntegrationEvent('coach-1', 'athlete-1', 'coachy', 'athletey', unlinkedBy)
}

describe('NotifyOnCoachLinkRemoved', () => {
    it('tells the athlete when the coach dropped them', async () => {
        const { handler, repo } = setup()

        await handler.handle(removedBy('coach'))

        expect(repo.all()).toHaveLength(1)
        const note = repo.all()[0]!
        expect(note.userId).toBe('athlete-1')
        expect(note.type).toBe('coach_unlinked')
        expect(note.data).toEqual({ coachId: 'coach-1', coachUsername: 'coachy' })
    })

    it('tells the coach when the athlete left', async () => {
        const { handler, repo } = setup()

        await handler.handle(removedBy('athlete'))

        const note = repo.all()[0]!
        expect(note.userId).toBe('coach-1')
        expect(note.type).toBe('athlete_unlinked')
        expect(note.data).toEqual({ athleteId: 'athlete-1', athleteUsername: 'athletey' })
    })
})
