import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryNotificationRepository } from '../../../../../../tests/doubles/notifications'
import { NotificationMother } from '../../../../../../tests/mothers/notifications'
import { MarkNotificationReadCommand } from './mark-notification-read.command'
import { MarkNotificationReadHandler } from './mark-notification-read.handler'

function setup(): { handler: MarkNotificationReadHandler; repo: InMemoryNotificationRepository } {
    const repo = new InMemoryNotificationRepository([
        NotificationMother.create().withId('a').forUser('u-1').build(),
        NotificationMother.create().withId('z').forUser('u-2').build(),
    ])
    return { handler: new MarkNotificationReadHandler(repo, new FakeClock()), repo }
}

describe('MarkNotificationReadHandler', () => {
    it('marks the caller’s notification read', async () => {
        const { handler, repo } = setup()

        expect(await handler.execute(new MarkNotificationReadCommand('u-1', 'a'))).toBe(true)
        expect(await repo.countUnread('u-1')).toBe(0)
    })

    it('is a no-op for a notification the caller does not own', async () => {
        const { handler, repo } = setup()

        expect(await handler.execute(new MarkNotificationReadCommand('u-1', 'z'))).toBe(false)
        expect(await repo.countUnread('u-2')).toBe(1)
    })

    it('returns false when the notification is already read', async () => {
        const { handler } = setup()

        await handler.execute(new MarkNotificationReadCommand('u-1', 'a'))
        expect(await handler.execute(new MarkNotificationReadCommand('u-1', 'a'))).toBe(false)
    })
})
