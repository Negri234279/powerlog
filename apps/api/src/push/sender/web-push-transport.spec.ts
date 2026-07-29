import { createECDH, randomBytes } from 'node:crypto'

import nock from 'nock'
import webpush from 'web-push'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { silentLogger } from '../../../tests/doubles/shared/silent-logger'
import type { PushPayload, StoredPushSubscription } from '../push.types'
import { WebPushTransport } from './web-push-transport'

const HOST = 'https://push.example.com'
const PAYLOAD: PushPayload = { title: 'Hi', body: 'A push', url: '/x' }

/** A subscription with real ECDH keys, so web-push actually encrypts the payload
 *  before the (nocked) HTTP call — exercising the real library path. */
function makeSubscription(): StoredPushSubscription {
    const ecdh = createECDH('prime256v1')
    ecdh.generateKeys()

    return {
        userId: 'user-1',
        endpoint: `${HOST}/send/${randomBytes(6).toString('hex')}`,
        p256dh: ecdh.getPublicKey().toString('base64url'),
        auth: randomBytes(16).toString('base64url'),
        locale: 'en',
    }
}

describe('WebPushTransport', () => {
    let transport: WebPushTransport

    beforeAll(() => {
        nock.disableNetConnect()
    })

    afterAll(() => {
        nock.enableNetConnect()
    })

    beforeEach(() => {
        const keys = webpush.generateVAPIDKeys()
        transport = new WebPushTransport(
            { subject: 'mailto:test@powerlog.app', publicKey: keys.publicKey, privateKey: keys.privateKey },
            silentLogger(),
        )
    })

    afterEach(() => {
        nock.cleanAll()
    })

    it('exposes the configured public key', () => {
        expect(transport.publicKey).toMatch(/.+/)
    })

    it('reports a successful delivery as sent', async () => {
        nock(HOST).post(/.*/).reply(201)

        expect(await transport.deliver(makeSubscription(), PAYLOAD)).toBe('sent')
    })

    it('reports a 410 Gone as gone (the subscription is dead — prune it)', async () => {
        nock(HOST).post(/.*/).reply(410)

        expect(await transport.deliver(makeSubscription(), PAYLOAD)).toBe('gone')
    })

    it('reports a 404 as gone', async () => {
        nock(HOST).post(/.*/).reply(404)

        expect(await transport.deliver(makeSubscription(), PAYLOAD)).toBe('gone')
    })

    it('reports a transient 500 as error (kept for a later retry)', async () => {
        nock(HOST).post(/.*/).reply(500)

        expect(await transport.deliver(makeSubscription(), PAYLOAD)).toBe('error')
    })
})
