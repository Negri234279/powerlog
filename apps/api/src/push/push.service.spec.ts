import { beforeEach, describe, expect, it } from 'vitest'

import { FakePushTransport, InMemoryPushSubscriptionStore } from '../../tests/doubles/push'
import { counterValue, testCounter } from '../../tests/doubles/shared/test-counter'
import { silentLogger } from '../../tests/doubles/shared/silent-logger'
import { PushService } from './push.service'
import type { PushPayload } from './push.types'

const PAYLOAD: PushPayload = { title: 'Session planned', body: 'Your coach planned a session', url: '/sessions/1' }

function sub(userId: string, endpoint: string) {
    return { userId, endpoint, p256dh: 'p', auth: 'a', locale: 'en' as const, userAgent: null }
}

describe('PushService', () => {
    let store: InMemoryPushSubscriptionStore
    let transport: FakePushTransport
    let sent: ReturnType<typeof testCounter>
    let service: PushService

    beforeEach(() => {
        store = new InMemoryPushSubscriptionStore()
        transport = new FakePushTransport()
        sent = testCounter(['status'])
        service = new PushService(store, transport, sent, silentLogger())
    })

    it('delivers to every subscription of the targeted users and counts them sent', async () => {
        await store.save(sub('user-1', 'https://push/one'))
        await store.save(sub('user-1', 'https://push/two')) // second device
        await store.save(sub('other', 'https://push/other'))

        await service.send(['user-1'], PAYLOAD)

        expect(transport.delivered.map((d) => d.subscription.endpoint).sort()).toEqual([
            'https://push/one',
            'https://push/two',
        ])
        expect(transport.delivered[0]!.payload).toEqual(PAYLOAD)
        expect(await counterValue(sent, { status: 'sent' })).toBe(2)
    })

    it('prunes a subscription the push service reports as gone', async () => {
        await store.save(sub('user-1', 'https://push/dead'))
        transport.returns('gone')

        await service.send(['user-1'], PAYLOAD)

        expect(store.rows.has('https://push/dead')).toBe(false)
        expect(await counterValue(sent, { status: 'gone' })).toBe(1)
    })

    it('keeps a subscription that merely errored (transient), counting the error', async () => {
        await store.save(sub('user-1', 'https://push/flaky'))
        transport.returns('error')

        await service.send(['user-1'], PAYLOAD)

        expect(store.rows.has('https://push/flaky')).toBe(true)
        expect(await counterValue(sent, { status: 'error' })).toBe(1)
    })

    it('is a no-op when push is not configured (no public key), without touching the store', async () => {
        await store.save(sub('user-1', 'https://push/one'))
        transport.publicKey = null

        await service.send(['user-1'], PAYLOAD)

        expect(transport.delivered).toHaveLength(0)
    })

    it('does nothing when the user list is empty or the users have no subscriptions', async () => {
        await service.send([], PAYLOAD)
        await service.send(['nobody'], PAYLOAD)

        expect(transport.delivered).toHaveLength(0)
    })
})
