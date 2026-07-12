import { describe, expect, it } from 'vitest'

import { InMemoryNotificationRepository } from '../../../../../../tests/doubles/notifications'
import { NotificationMother } from '../../../../../../tests/mothers/notifications'
import { DeleteNotificationCommand } from './delete-notification.command'
import { DeleteNotificationHandler } from './delete-notification.handler'

function setup(): { handler: DeleteNotificationHandler; repo: InMemoryNotificationRepository } {
    const repo = new InMemoryNotificationRepository([
        NotificationMother.create().withId('a').forUser('u-1').build(),
        NotificationMother.create().withId('z').forUser('u-2').build(),
    ])

    return { handler: new DeleteNotificationHandler(repo), repo }
}

describe('DeleteNotificationHandler', () => {
    it('removes the caller’s notification from their inbox', async () => {
        const { handler, repo } = setup()

        expect(await handler.execute(new DeleteNotificationCommand('u-1', 'a'))).toBe(true)
        expect(repo.all().map((n) => n.id)).toEqual(['z'])
        expect(await repo.countUnread('u-1')).toBe(0)
    })

    it('is a no-op for a notification the caller does not own', async () => {
        const { handler, repo } = setup()

        expect(await handler.execute(new DeleteNotificationCommand('u-1', 'z'))).toBe(false)
        // The other user's notification is untouched, and the caller learns nothing
        // about whether that id exists.
        expect(repo.all().map((n) => n.id)).toEqual(['a', 'z'])
    })

    it('deletes an unread notification too (dismissing it is the user’s call)', async () => {
        const { handler, repo } = setup()

        expect(await repo.countUnread('u-1')).toBe(1)
        await handler.execute(new DeleteNotificationCommand('u-1', 'a'))

        expect(await repo.countUnread('u-1')).toBe(0)
    })
})
