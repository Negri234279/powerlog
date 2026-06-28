import { describe, expect, it } from 'vitest'

import { InMemoryNotificationRepository } from '../../../../../../tests/doubles/notifications'
import { NotificationMother } from '../../../../../../tests/mothers/notifications'
import { CountUnreadNotificationsHandler } from './count-unread-notifications.handler'
import { CountUnreadNotificationsQuery } from './count-unread-notifications.query'

describe('CountUnreadNotificationsHandler', () => {
    it('counts only the caller’s unread notifications', async () => {
        const repo = new InMemoryNotificationRepository([
            NotificationMother.create().withId('a').forUser('u-1').build(),
            NotificationMother.create().withId('b').forUser('u-1').build(),
            NotificationMother.create().withId('c').forUser('u-1').readAtTime().build(),
            NotificationMother.create().withId('z').forUser('u-2').build(),
        ])
        const handler = new CountUnreadNotificationsHandler(repo)

        expect(await handler.execute(new CountUnreadNotificationsQuery('u-1'))).toBe(2)
    })
})
