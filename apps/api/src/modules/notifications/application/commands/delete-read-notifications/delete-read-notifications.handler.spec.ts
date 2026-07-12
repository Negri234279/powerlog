import { describe, expect, it } from 'vitest'

import { InMemoryNotificationRepository } from '../../../../../../tests/doubles/notifications'
import { NotificationMother } from '../../../../../../tests/mothers/notifications'
import { DeleteReadNotificationsCommand } from './delete-read-notifications.command'
import { DeleteReadNotificationsHandler } from './delete-read-notifications.handler'

const READ_AT = new Date('2026-01-02T00:00:00.000Z')

function setup(): { handler: DeleteReadNotificationsHandler; repo: InMemoryNotificationRepository } {
    const repo = new InMemoryNotificationRepository([
        NotificationMother.create().withId('read-1').forUser('u-1').readAtTime(READ_AT).build(),
        NotificationMother.create().withId('read-2').forUser('u-1').readAtTime(READ_AT).build(),
        NotificationMother.create().withId('unread').forUser('u-1').build(),
        NotificationMother.create().withId('other-user').forUser('u-2').readAtTime(READ_AT).build(),
    ])

    return { handler: new DeleteReadNotificationsHandler(repo), repo }
}

describe('DeleteReadNotificationsHandler', () => {
    it('clears the read ones and keeps the unread', async () => {
        const { handler, repo } = setup()

        expect(await handler.execute(new DeleteReadNotificationsCommand('u-1'))).toBe(2)
        // Unread survives on purpose: you can't lose what you haven't seen.
        expect(repo.all().map((n) => n.id)).toEqual(['unread', 'other-user'])
        expect(await repo.countUnread('u-1')).toBe(1)
    })

    it('never touches another user’s inbox', async () => {
        const { handler, repo } = setup()

        await handler.execute(new DeleteReadNotificationsCommand('u-1'))

        expect(repo.all().some((n) => n.userId === 'u-2')).toBe(true)
    })

    it('returns 0 when there is nothing read to clear', async () => {
        const { handler } = setup()

        await handler.execute(new DeleteReadNotificationsCommand('u-1'))

        expect(await handler.execute(new DeleteReadNotificationsCommand('u-1'))).toBe(0)
    })
})
