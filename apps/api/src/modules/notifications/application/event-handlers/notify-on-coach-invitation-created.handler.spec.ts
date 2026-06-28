import { describe, expect, it } from 'vitest'

import { FakeClock, FakeIdGenerator, InMemoryNotificationRepository } from '../../../../../tests/doubles/notifications'
import { FakeMailer, FakeUserDirectory } from '../../../../../tests/doubles/shared'
import { counterValue, testCounter } from '../../../../../tests/doubles/shared/test-counter'
import { CoachInvitationCreatedIntegrationEvent } from '../../../../shared/integration-events/coach-invitation-created.integration-event'
import { NotificationService } from '../services/notification.service'
import { NotifyOnCoachInvitationCreated } from './notify-on-coach-invitation-created.handler'

function setup(directory: FakeUserDirectory) {
    const repo = new InMemoryNotificationRepository()
    const mailer = new FakeMailer()
    const counter = testCounter(['type'])
    const service = new NotificationService(repo, new FakeIdGenerator(['n-1']), new FakeClock(), mailer, counter)
    const handler = new NotifyOnCoachInvitationCreated(service, directory)
    return { handler, repo, mailer, counter }
}

const EVENT = new CoachInvitationCreatedIntegrationEvent('inv-1', 'coach-1', 'athlete-1', 'coachy')

describe('NotifyOnCoachInvitationCreated', () => {
    it('creates a coach_invitation bell entry and emails the athlete', async () => {
        const directory = new FakeUserDirectory().seed('athlete-1', {
            email: 'athlete@example.com',
            username: 'athletey',
        })
        const { handler, repo, mailer, counter } = setup(directory)

        await handler.handle(EVENT)

        const [notification] = repo.all()
        expect(notification?.userId).toBe('athlete-1')
        expect(notification?.type).toBe('coach_invitation')
        expect(notification?.data).toEqual({ invitationId: 'inv-1', coachId: 'coach-1', coachUsername: 'coachy' })
        expect(await repo.countUnread('athlete-1')).toBe(1)
        expect(await counterValue(counter, { type: 'coach_invitation' })).toBe(1)

        expect(mailer.last()?.to).toBe('athlete@example.com')
        expect(mailer.last()?.tag).toBe('coach_invitation')
        expect(mailer.last()?.subject).toContain('coachy')
    })

    it('still creates the bell entry when the athlete has no resolvable contact', async () => {
        const { handler, repo, mailer } = setup(new FakeUserDirectory())

        await handler.handle(EVENT)

        expect(await repo.countUnread('athlete-1')).toBe(1)
        expect(mailer.sent).toHaveLength(0)
    })
})
