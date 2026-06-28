import { describe, expect, it } from 'vitest'

import { InMemoryNotificationRepository } from '../../../../../../tests/doubles/notifications'
import { NotificationMother } from '../../../../../../tests/mothers/notifications'
import { ListNotificationsHandler } from './list-notifications.handler'
import { ListNotificationsQuery } from './list-notifications.query'
import { decodeNotificationCursor } from './notification-cursor'

function seed(): InMemoryNotificationRepository {
    // Three notifications for u-1 across three days (+ one for another user).
    return new InMemoryNotificationRepository([
        NotificationMother.create().withId('a').forUser('u-1').createdAtTime(new Date('2026-03-01T00:00:00Z')).build(),
        NotificationMother.create().withId('b').forUser('u-1').createdAtTime(new Date('2026-03-02T00:00:00Z')).build(),
        NotificationMother.create().withId('c').forUser('u-1').createdAtTime(new Date('2026-03-03T00:00:00Z')).build(),
        NotificationMother.create().withId('z').forUser('u-2').createdAtTime(new Date('2026-03-09T00:00:00Z')).build(),
    ])
}

describe('ListNotificationsHandler', () => {
    it('returns the caller’s notifications newest-first and paginates via cursor', async () => {
        const handler = new ListNotificationsHandler(seed())

        const first = await handler.execute(new ListNotificationsQuery('u-1', 2))
        expect(first.items.map((n) => n.id)).toEqual(['c', 'b'])
        expect(first.hasNextPage).toBe(true)
        expect(first.nextCursor).not.toBeNull()
        expect(decodeNotificationCursor(first.nextCursor!)).toEqual({
            createdAt: new Date('2026-03-02T00:00:00Z'),
            id: 'b',
        })

        const second = await handler.execute(new ListNotificationsQuery('u-1', 2, first.nextCursor))
        expect(second.items.map((n) => n.id)).toEqual(['a'])
        expect(second.hasNextPage).toBe(false)
        expect(second.nextCursor).toBeNull()
    })

    it('rejects a malformed cursor', async () => {
        const handler = new ListNotificationsHandler(seed())

        await expect(handler.execute(new ListNotificationsQuery('u-1', 20, 'not-a-cursor'))).rejects.toMatchObject({
            code: 'INVALID_NOTIFICATION_CURSOR',
        })
    })
})
