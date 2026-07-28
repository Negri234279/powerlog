import { beforeEach, describe, expect, it } from 'vitest'

import { FakePushTransport, InMemoryPushSubscriptionStore } from '../../../tests/doubles/push'
import type { AuthUser } from '../../auth/auth-user'
import { PushResolver } from './push.resolver'

const USER = { userId: 'user-1' } as AuthUser
const INPUT = {
    endpoint: 'https://push/endpoint',
    p256dh: 'p256dh-key',
    auth: 'auth-secret',
    locale: 'es' as const,
    userAgent: 'test-agent',
}

describe('PushResolver', () => {
    let store: InMemoryPushSubscriptionStore
    let transport: FakePushTransport
    let resolver: PushResolver

    beforeEach(() => {
        store = new InMemoryPushSubscriptionStore()
        transport = new FakePushTransport()
        resolver = new PushResolver(store, transport)
    })

    it('exposes the VAPID public key', () => {
        expect(resolver.pushPublicKey()).toBe('test-public-key')
    })

    it('stores the subscription against the caller and defaults are applied', async () => {
        const ok = await resolver.registerPushSubscription(USER, INPUT)

        expect(ok).toBe(true)
        expect(store.rows.get(INPUT.endpoint)).toMatchObject({ userId: 'user-1', locale: 'es' })
    })

    it('refuses to register when push is not configured, without storing anything', async () => {
        transport.publicKey = null

        const ok = await resolver.registerPushSubscription(USER, INPUT)

        expect(ok).toBe(false)
        expect(resolver.pushPublicKey()).toBeNull()
        expect(store.rows.size).toBe(0)
    })

    it('removes only the caller’s own subscription', async () => {
        await store.save({ ...INPUT, userId: 'user-1', locale: 'es' })

        expect(await resolver.removePushSubscription({ userId: 'someone-else' } as AuthUser, INPUT.endpoint)).toBe(
            false,
        )
        expect(await resolver.removePushSubscription(USER, INPUT.endpoint)).toBe(true)
        expect(store.rows.size).toBe(0)
    })
})
