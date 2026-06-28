import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryNotificationRepository } from '../../../../../../tests/doubles/notifications'
import { NotificationMother } from '../../../../../../tests/mothers/notifications'
import { MarkAllNotificationsReadCommand } from './mark-all-notifications-read.command'
import { MarkAllNotificationsReadHandler } from './mark-all-notifications-read.handler'

describe('MarkAllNotificationsReadHandler', () => {
    it('marks all of the caller’s unread notifications and leaves other users alone', async () => {
        const repo = new InMemoryNotificationRepository([
            NotificationMother.create().withId('a').forUser('u-1').build(),
            NotificationMother.create().withId('b').forUser('u-1').build(),
            NotificationMother.create().withId('c').forUser('u-1').readAtTime().build(),
            NotificationMother.create().withId('z').forUser('u-2').build(),
        ])
        const handler = new MarkAllNotificationsReadHandler(repo, new FakeClock())

        expect(await handler.execute(new MarkAllNotificationsReadCommand('u-1'))).toBe(2)
        expect(await repo.countUnread('u-1')).toBe(0)
        expect(await repo.countUnread('u-2')).toBe(1)
    })
})
